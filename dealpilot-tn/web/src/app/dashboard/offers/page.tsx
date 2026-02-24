'use client'
import { useOffers } from '../../../lib/hooks';
import { useState } from 'react';

export default function OffersPage(){
  const { data, addOffer, removeOffer } = useOffers();
  const rows = data?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState('');
  const [reason, setReason] = useState('');

  const handleAdd = async () => {
    if (!score) return;
    await addOffer({ score: Number(score), reason });
    setScore(''); setReason(''); setShowForm(false);
  };

  return (<div>
    <div className="flex justify-between items-center">
      <h1 className="text-xl">Offer Scores</h1>
      <button onClick={()=>setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
        {showForm ? 'Cancel' : '+ Add Score'}
      </button>
    </div>
    {showForm && (
      <div className="mt-4 p-4 border rounded space-y-2">
        <input placeholder="Score (1-100)" type="number" value={score} onChange={e=>setScore(e.target.value)} className="border p-2 w-full rounded" />
        <input placeholder="Reason / Notes" value={reason} onChange={e=>setReason(e.target.value)} className="border p-2 w-full rounded" />
        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
      </div>
    )}
    <table className="w-full mt-4"><thead><tr><th>Score</th><th>Reason</th><th>Date</th><th></th></tr></thead>
      <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.score}</td><td>{r.reason}</td>
        <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
        <td><button onClick={()=>removeOffer(r.id)} className="text-red-500 text-sm">Delete</button></td></tr>))}</tbody></table>
  </div>);
}
