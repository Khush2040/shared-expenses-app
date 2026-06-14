import { getGroupBalances } from '@/lib/balances';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return <div>Group not found</div>;

  const balancesObj = await getGroupBalances(groupId);
  const balances = Object.values(balancesObj).sort((a, b) => b.balance - a.balance);

  // Simple debt simplification: Who pays whom
  // positive = owed money, negative = owes money
  const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) }));
  const creditors = balances.filter(b => b.balance > 0.01);
  
  const settlements = [];
  let d = 0, c = 0;
  
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    
    const amount = Math.min(debtor.balance, creditor.balance);
    
    settlements.push({
      from: debtor.user.name,
      to: creditor.user.name,
      amount
    });
    
    debtor.balance -= amount;
    creditor.balance -= amount;
    
    if (debtor.balance < 0.01) d++;
    if (creditor.balance < 0.01) c++;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="header-title">{group.name} Balances</h2>
        <Link href="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Back to Dashboard</Link>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="mb-4 text-secondary">Simplified Debts</h3>
          {settlements.length === 0 ? (
            <p>All settled up!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-bg-primary rounded-md border border-color">
                  <span><strong>{s.from}</strong> owes <strong>{s.to}</strong></span>
                  <span className="badge badge-warning">{s.amount.toFixed(2)} {group.defaultCurrency}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 text-secondary">Individual Balances</h3>
          <div className="flex flex-col gap-2">
            {balances.map(b => (
              <Link href={`/group/${group.id}/user/${b.user.id}`} key={b.user.id} style={{ textDecoration: 'none' }}>
                <div className="flex justify-between items-center p-3 bg-bg-primary rounded-md border border-color hover:bg-bg-tertiary transition-colors">
                  <span>{b.user.name}</span>
                  <span className={`badge ${b.balance >= 0 ? 'badge-success' : 'badge-danger'}`}>
                    {b.balance >= 0 ? '+' : ''}{b.balance.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
