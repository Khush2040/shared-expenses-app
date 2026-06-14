import { prisma } from './prisma';
import { parse } from 'date-fns';

export async function processRowIntoExpense(rowData: any, groupId: string, importerUserId: string) {
  // Parse date
  let date = new Date();
  try {
    date = parse(rowData.date, 'dd-MM-yyyy', new Date());
    if (isNaN(date.getTime())) date = parse(rowData.date, 'MMM-dd', new Date());
  } catch(e) {}

  if (isNaN(date.getTime())) date = new Date();

  // Find payer
  const allUsers = await prisma.user.findMany();
  let payer = null;
  if (rowData.paid_by) {
    payer = allUsers.find(u => u.name.toLowerCase() === rowData.paid_by.trim().toLowerCase()) || null;
  }

  // Check if settlement
  if (rowData.split_with && rowData.split_with.split(';').length === 1 && (!rowData.split_type || rowData.split_type.trim() === '')) {
    const paidTo = allUsers.find(u => u.name.toLowerCase() === rowData.split_with.trim().toLowerCase()) || null;
    
    if (payer && paidTo) {
      return await prisma.settlement.create({
        data: {
          groupId,
          paidByUserId: payer.id,
          paidToUserId: paidTo.id,
          amount: parseFloat(rowData.amount),
          currency: rowData.currency || 'INR',
          date
        }
      });
    }
  }

  // Create expense
  const amount = parseFloat(rowData.amount);
  
  // If negative amount (refund), we keep it negative, logic handles it.

  const expense = await prisma.expense.create({
    data: {
      groupId,
      paidByUserId: payer?.id || importerUserId, // Fallback to importer if unresolved
      description: rowData.description,
      amount,
      currency: rowData.currency || 'INR',
      date,
      notes: rowData.notes
    }
  });

  // Process splits
  const splitWithNames = rowData.split_with.split(';').map((s: string) => s.trim());
  const splitUsers = await prisma.user.findMany({
    where: { name: { in: splitWithNames } }
  });

  const splitType = (rowData.split_type || 'equal').toLowerCase().trim();
  const splitsData = [];

  if (splitType === 'equal') {
    const perPerson = amount / splitUsers.length;
    for (const u of splitUsers) {
      splitsData.push({
        expenseId: expense.id,
        userId: u.id,
        amountOwed: perPerson,
        splitType: 'EQUAL'
      });
    }
  } else if (splitType === 'unequal' || splitType === 'exact') {
    // Expected format: "Name amount; Name amount"
    const details = rowData.split_details.split(';');
    for (const d of details) {
      const match = d.trim().match(/([a-zA-Z]+)\s+([\d.]+)/);
      if (match) {
        const name = match[1];
        const val = parseFloat(match[2]);
        const u = splitUsers.find(su => su.name.toLowerCase() === name.toLowerCase());
        if (u) {
          splitsData.push({
            expenseId: expense.id,
            userId: u.id,
            amountOwed: val,
            splitType: 'EXACT',
            splitValue: val
          });
        }
      }
    }
  } else if (splitType === 'percentage') {
    const details = rowData.split_details.split(';');
    for (const d of details) {
      const match = d.trim().match(/([a-zA-Z]+)\s+(\d+)%/);
      if (match) {
        const name = match[1];
        const percent = parseFloat(match[2]);
        const u = splitUsers.find(su => su.name.toLowerCase() === name.toLowerCase());
        if (u) {
          splitsData.push({
            expenseId: expense.id,
            userId: u.id,
            amountOwed: (percent / 100) * amount,
            splitType: 'PERCENTAGE',
            splitValue: percent
          });
        }
      }
    }
  } else if (splitType === 'share') {
    const details = rowData.split_details.split(';');
    let totalShares = 0;
    const shareMap = new Map();
    for (const d of details) {
      const match = d.trim().match(/([a-zA-Z]+)\s+(\d+)/);
      if (match) {
        const shares = parseFloat(match[2]);
        totalShares += shares;
        shareMap.set(match[1].toLowerCase(), shares);
      }
    }
    for (const u of splitUsers) {
      const shares = shareMap.get(u.name.toLowerCase()) || 0;
      splitsData.push({
        expenseId: expense.id,
        userId: u.id,
        amountOwed: (shares / totalShares) * amount,
        splitType: 'SHARE',
        splitValue: shares
      });
    }
  }

  if (splitsData.length > 0) {
    await prisma.expenseSplit.createMany({ data: splitsData });
  }

  return expense;
}
