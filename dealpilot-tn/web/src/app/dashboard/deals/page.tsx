'use client'
import { useDeals } from '../../../lib/hooks';
import { useState } from 'react';

export default function DealsPage(){
  const { data, addDeal, removeDeal } = useDeals();
  const rows = data?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('active');
  const [value, setValue] = useState('');

  const handleAdd = async () => {
    if (!title) return;
    await addDeal({ title, status, value: value ? Number(value) : null });
    setTitle(''); setStatus('active'); setValue(''); setShowForm(false);
  };

  return (<div>
    <div className="flex justify-between items-center">
      <h1 className="text-xl">Deals</h1>
      <button onClick={()=>setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
        {showForm ? 'Cancel' : '+ Add Deal'}
      </button>
    </div>
    {showForm && (
      <div className="mt-4 p-4 border rounded space-y-2">
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} className="border p-2 w-full rounded" />
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border p-2 w-full rounded">
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
          <option value="lost">Lost</option>
        </select>
        <input placeholder="Value ($)" type="number" value={value} onChange={e=>setValue(e.target.value)} className="border p-2 w-full rounded" />
        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
      </div>
    )}
    <table className="w-full mt-4"><thead><tr><th>Title</th><th>Status</th><th>Value</th><th></th></tr></thead>
      <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.title}</td><td>{r.status}</td><td>{r.value ? `$${r.value}` : '-'}</td>
        <td><button onClick={()=>removeDeal(r.id)} className="text-red-500 text-sm">Delete</button></td></tr>))}</tbody></table>
  </div>);
}
