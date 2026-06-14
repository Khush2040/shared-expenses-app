'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveAnomaly, commitImportJob } from '@/app/actions';

export default function AnomalyResolver({ initialAnomalies, jobId }: { initialAnomalies: any[], jobId: string }) {
  const router = useRouter();
  const [anomalies, setAnomalies] = useState(initialAnomalies);
  const [committing, setCommitting] = useState(false);

  const pendingCount = anomalies.filter(a => a.resolutionStatus === 'PENDING').length;

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT', editedData?: string) => {
    try {
      await resolveAnomaly(id, action, editedData);
      setAnomalies(prev => prev.map(a => a.id === id ? { ...a, resolutionStatus: action, rowData: editedData || a.rowData } : a));
    } catch (err) {
      console.error(err);
      alert('Failed to update resolution');
    }
  };

  const handleCommit = async () => {
    if (!confirm('Are you sure you want to commit the approved rows to the database?')) return;
    setCommitting(true);
    try {
      // Hardcode an importer userId for now or fetch it from context/session. 
      // For this assignment, we assume the first user is the importer since there's no auth.
      // Wait, we can pass a dummy or known userId. Let's pass '1' but Prisma uses UUIDs.
      // We didn't pass importerUserId to commit. Let's pass a placeholder or let the backend fallback.
      await commitImportJob(jobId, '');
      alert('Import successful!');
      router.push('/');
    } catch (err) {
      console.error(err);
      alert('Failed to commit import job');
      setCommitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center bg-secondary p-4 rounded-md">
        <div>
          <span className="font-bold text-lg">{pendingCount}</span> anomalies pending review.
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleCommit} 
          disabled={pendingCount > 0 || committing}
        >
          {committing ? 'Committing...' : 'Commit Import'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {anomalies.map(a => (
          <AnomalyCard key={a.id} anomaly={a} onResolve={handleAction} />
        ))}
      </div>
    </div>
  );
}

function AnomalyCard({ anomaly, onResolve }: { anomaly: any, onResolve: Function }) {
  const [editing, setEditing] = useState(false);
  const [rowData, setRowData] = useState(anomaly.rowData);

  const isResolved = anomaly.resolutionStatus !== 'PENDING';
  const isNone = anomaly.issueType === 'NONE';

  const row = JSON.parse(rowData);

  return (
    <div className={`card ${isResolved ? 'opacity-75' : ''}`} style={{ borderColor: isResolved ? 'var(--border-color)' : 'var(--accent-warning)' }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">Row {anomaly.rowIndex}</span>
            {isNone ? (
              <span className="badge badge-success">Valid</span>
            ) : (
              <span className="badge badge-warning">{anomaly.issueType}</span>
            )}
            {isResolved && <span className={`badge ${anomaly.resolutionStatus === 'APPROVED' ? 'badge-success' : 'badge-danger'}`}>{anomaly.resolutionStatus}</span>}
          </div>
          <p className="text-secondary text-sm">{anomaly.issueDescription}</p>
          {!isNone && <p className="text-sm mt-1"><strong>Proposed Action:</strong> {anomaly.proposedAction}</p>}
        </div>
        
        {!isResolved && (
          <div className="flex gap-2">
            {!isNone && (
              <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel Edit' : 'Edit Data'}
              </button>
            )}
            <button className="btn btn-danger" onClick={() => onResolve(anomaly.id, 'REJECT')}>Reject</button>
            <button className="btn btn-success" onClick={() => onResolve(anomaly.id, 'APPROVE', rowData)}>Approve</button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea 
          className="w-full bg-tertiary text-primary p-2 rounded-md font-mono text-sm border-color" 
          rows={6}
          value={rowData}
          onChange={e => setRowData(e.target.value)}
        />
      ) : (
        <div className="bg-bg-primary p-3 rounded-md overflow-x-auto text-sm border border-color">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div><span className="text-secondary">Date:</span> {row.date}</div>
            <div><span className="text-secondary">Amount:</span> {row.amount} {row.currency}</div>
            <div><span className="text-secondary">Paid By:</span> {row.paid_by}</div>
            <div className="col-span-2"><span className="text-secondary">Desc:</span> {row.description}</div>
            <div className="col-span-2"><span className="text-secondary">Split Type:</span> {row.split_type || 'equal'} | <span className="text-secondary">Split With:</span> {row.split_with}</div>
            {row.split_details && <div className="col-span-2"><span className="text-secondary">Split Details:</span> {row.split_details}</div>}
            {row.notes && <div className="col-span-2 text-warning"><span className="text-secondary">Notes:</span> {row.notes}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
