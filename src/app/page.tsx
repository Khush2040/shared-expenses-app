import { getGroups } from './actions';
import Link from 'next/link';

export default async function DashboardPage() {
  const groups = await getGroups();

  return (
    <div>
      <h2 className="mb-4 text-secondary">Your Groups</h2>
      
      {groups.length === 0 ? (
        <div className="card text-center">
          <p className="mb-4">No groups found.</p>
          <p className="text-sm text-secondary">Please import some data or seed the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {groups.map(group => (
            <Link key={group.id} href={`/group/${group.id}`} style={{ textDecoration: 'none' }}>
              <div className="card flex flex-col items-center justify-center gap-2" style={{ cursor: 'pointer', minHeight: '150px' }}>
                <h3 style={{ color: 'var(--text-primary)' }}>{group.name}</h3>
                <span className="badge badge-success">View Balances</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
