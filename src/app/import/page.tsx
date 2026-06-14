'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGroups, getUsers, uploadCsvAction } from '../actions';

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getGroups().then(g => {
      setGroups(g);
      if (g.length > 0) setSelectedGroup(g[0].id);
    });
    getUsers().then(u => {
      setUsers(u);
      if (u.length > 0) setSelectedUser(u[0].id);
    });
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedGroup || !selectedUser) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', selectedGroup);
    formData.append('userId', selectedUser);

    try {
      const jobId = await uploadCsvAction(formData);
      router.push(`/import/${jobId}`);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 className="mb-4">Import Expenses CSV</h2>
      <p className="text-sm text-secondary mb-6">
        Select the CSV file exported from your spreadsheet to automatically detect anomalies and generate expense records.
      </p>

      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Importer (You)</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Target Group</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">CSV File</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ padding: '0.75rem', border: '1px dashed var(--border-color)', background: 'transparent' }}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary mt-4"
          disabled={!file || !selectedGroup || !selectedUser || loading}
        >
          {loading ? 'Uploading & Analyzing...' : 'Analyze CSV'}
        </button>
      </form>
    </div>
  );
}
