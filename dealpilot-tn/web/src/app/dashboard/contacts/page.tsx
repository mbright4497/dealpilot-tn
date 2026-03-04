'use client'
import { useContacts, useDeals } from '../../../lib/hooks';
import { useState } from 'react';

export default function ContactsPage(){
  const { data, addContact, removeContact, mutate } = useContacts();
  const dealsHook = useDeals();
  const deals = dealsHook.data?.data || [];
  const rows = data?.data || [];

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any|null>(null);
  const [filter, setFilter] = useState('');

  const empty = { name:'', email:'', phone:'', role:'Other', deal_id: '' }
  const [form, setForm] = useState<any>(empty)

  const handleAdd = async () => {
    if (!form.name) return;
    if(editing){
      // update via API
      await fetch(`/api/contacts/${editing.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    } else {
      await addContact(form);
    }
    setForm(empty); setShowForm(false); setEditing(null); if(mutate) mutate();
  };

  const handleDelete = async (id:string)=>{
    if(!confirm('Delete contact?')) return
    await removeContact(id)
    if(mutate) mutate()
  }

  const openForEdit = (r:any)=>{ setEditing(r); setForm({ name:r.name, email:r.email, phone:r.phone, role:r.role||'Other', deal_id: r.deal_id||'' }); setShowForm(true) }

  const filtered = rows.filter((r:any)=> (r.name||'').toLowerCase().includes(filter.toLowerCase()) || (r.email||'').toLowerCase().includes(filter.toLowerCase()) || (r.phone||'').includes(filter))

  return (<div>
    <div className="flex justify-between items-center">
      <h1 className="text-xl">Contacts</h1>
      <div className="flex gap-2">
        <input placeholder="Search contacts" value={filter} onChange={e=>setFilter(e.target.value)} className="border p-2 rounded" />
        <button onClick={()=>{ setShowForm(!showForm); setEditing(null); setForm(empty) }} className="bg-blue-600 text-white px-4 py-2 rounded">
          {showForm ? 'Cancel' : '+ Add Contact'}
        </button>
      </div>
    </div>

    {showForm && (
      <div className="mt-4 p-4 border rounded space-y-2 bg-slate-900 border-slate-700 text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="border p-2 w-full rounded bg-black" />
          <select value={form.role} onChange={e=>setForm({...form, role: e.target.value})} className="border p-2 w-full rounded bg-black">
            <option>Buyer</option><option>Seller</option><option>Lender</option><option>Inspector</option><option>Attorney</option><option>Title Company</option><option>Other</option>
          </select>
          <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="border p-2 w-full rounded bg-black" />
          <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="border p-2 w-full rounded bg-black" />
          <select value={form.deal_id} onChange={e=>setForm({...form, deal_id: e.target.value})} className="border p-2 w-full rounded bg-black">
            <option value="">Link to deal (optional)</option>
            {deals.map((d:any)=>(<option key={d.id} value={d.id}>{d.address}</option>))}
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">{editing ? 'Save' : 'Save'}</button>
        </div>
      </div>
    )}

    <div className="mt-4 bg-[#0f1724] p-2 rounded">
      <table className="w-full">
        <thead className="text-left text-sm text-gray-400"><tr><th className="p-2">Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Deal</th><th></th></tr></thead>
        <tbody>
          {filtered.map((r:any)=>(
            <tr key={r.id} className="cursor-pointer hover:bg-[#0b1220]" onClick={()=>openForEdit(r)}>
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.role||'Other'}</td>
              <td className="p-2">{r.phone}</td>
              <td className="p-2">{r.email}</td>
              <td className="p-2">{r.deal_id ? (deals.find((d:any)=>d.id===r.deal_id)?.address || 'Linked') : '-'}</td>
              <td className="p-2"><div className="flex gap-2"><button onClick={(e)=>{ e.stopPropagation(); openForEdit(r) }} className="text-sm text-blue-400">Edit</button><button onClick={(e)=>{ e.stopPropagation(); handleDelete(r.id) }} className="text-sm text-red-500">Delete</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>);
}
