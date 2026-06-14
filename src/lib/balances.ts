import { prisma } from '@/lib/prisma';

export async function getGroupBalances(groupId: string) {
  // A person's balance is: 
  // (Total amount they paid for expenses) - (Total amount they owe for splits)
  // + (Total amount paid in settlements to others) - (Total amount received in settlements)
  
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true }
  });

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true, paidBy: true }
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: { paidBy: true, paidTo: true }
  });

  const balances: Record<string, { user: any, balance: number, details: any[] }> = {};

  for (const m of members) {
    balances[m.user.id] = { user: m.user, balance: 0, details: [] };
  }

  for (const exp of expenses) {
    // If they paid, they gain positive balance
    if (exp.paidByUserId && balances[exp.paidByUserId]) {
      balances[exp.paidByUserId].balance += exp.amount;
      balances[exp.paidByUserId].details.push({
        type: 'PAID_EXPENSE',
        description: exp.description,
        amount: exp.amount,
        date: exp.date
      });
    }

    // If they owe, they lose balance
    for (const split of exp.splits) {
      if (balances[split.userId]) {
        balances[split.userId].balance -= split.amountOwed;
        balances[split.userId].details.push({
          type: 'OWED_SPLIT',
          description: exp.description,
          amount: -split.amountOwed,
          date: exp.date
        });
      }
    }
  }

  for (const st of settlements) {
    if (balances[st.paidByUserId]) {
      balances[st.paidByUserId].balance += st.amount;
      balances[st.paidByUserId].details.push({
        type: 'PAID_SETTLEMENT',
        description: `Paid to ${st.paidTo.name}`,
        amount: st.amount,
        date: st.date
      });
    }
    if (balances[st.paidToUserId]) {
      balances[st.paidToUserId].balance -= st.amount;
      balances[st.paidToUserId].details.push({
        type: 'RECEIVED_SETTLEMENT',
        description: `Received from ${st.paidBy.name}`,
        amount: -st.amount,
        date: st.date
      });
    }
  }

  return balances;
}
