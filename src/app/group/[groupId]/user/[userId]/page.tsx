import { getGroupBalances } from '@/lib/balances';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function UserBreakdownPage({ params }: { params: { groupId: string, userId: string } }) {
  const group = await prisma.group.findUnique({ where: { id: params.groupId } });
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  
  if (!group || !user) return <div>Not found</div>;

  const balancesObj = await getGroupBalances(params.groupId);
  const balanceData = balancesObj[params.userId];

  if (!balanceData) return <div>User not in group</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="header-title">{user.name}'s Breakdown</h2>
          <p className="text-secondary">Current Balance: <span className={balanceData.balance >= 0 ? 'text-accent-success' : 'text-accent-danger'}>{balanceData.balance >= 0 ? '+' : ''}{balanceData.balance.toFixed(2)}</span> {group.defaultCurrency}</p>
        </div>
        <Link href={`/group/${group.id}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>Back to Group</Link>
      </div>

      <div className="card">
        <h3 className="mb-4 text-secondary">Transaction History</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {balanceData.details.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((d, i) => (
                <tr key={i}>
                  <td>{d.date.toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      d.amount > 0 ? 'badge-success' : 'badge-danger'
                    }`}>
                      {d.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{d.description}</td>
                  <td style={{ textAlign: 'right', color: d.amount > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    {d.amount > 0 ? '+' : ''}{d.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {balanceData.details.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-secondary">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
