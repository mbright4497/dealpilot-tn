'use client'
import { useChecklists } from '../../../lib/hooks';
import { useState } from 'react';

export default function ChecklistsPage(){
  const { data, addChecklist, removeChecklist } = useChecklists();
  const rows = data?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('open');

  const handleAdd = async () => {
    if (!title) return;
    await addChecklist({ title, status });
    setTitle(''); setStatus('open'); setShowForm(false);
  };

  return (<div>
    <div className="flex justify-between items-center">
      <h1 className="text-xl">Checklists</h1>
      <button onClick={()=>setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
        {showForm ? 'Cancel' : '+ Add Checklist'}
      </button>
    </div>
    {showForm && (
      <div className="mt-4 p-4 border rounded space-y-2">
        <input placeholder="Checklist Title" value={title} onChange={e=>setTitle(e.target.value)} className="border p-2 w-full rounded" />
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border p-2 w-full rounded">
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
      </div>
    )}
    <table className="w-full mt-4"><thead><tr><th>Title</th><th>Status</th><th></th></tr></thead>
      <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.title}</td><td>{r.status}</td>
        <td><button onClick={()=>removeChecklist(r.id)} className="text-red-500 text-sm">Delete</button></td></tr>))}</tbody></table>
  </div>);
}
