'use client'
import { useContacts } from '../../../lib/hooks';
import { useState } from 'react';

export default function ContactsPage(){
  const { data, addContact, removeContact } = useContacts();
  const rows = data?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = async () => {
    if (!name) return;
    await addContact({ name, email, phone });
    setName(''); setEmail(''); setPhone(''); setShowForm(false);
  };

  return (<div>
    <div className="flex justify-between items-center">
      <h1 className="text-xl">Contacts</h1>
      <button onClick={()=>setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
        {showForm ? 'Cancel' : '+ Add Contact'}
      </button>
    </div>
    {showForm && (
      <div className="mt-4 p-4 border rounded space-y-2">
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="border p-2 w-full rounded" />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="border p-2 w-full rounded" />
        <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} className="border p-2 w-full rounded" />
        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
      </div>
    )}
    <table className="w-full mt-4"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th></th></tr></thead>
      <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.phone}</td><td>{r.email}</td>
        <td><button onClick={()=>removeContact(r.id)} className="text-red-500 text-sm">Delete</button></td></tr>))}</tbody></table>
  </div>);
}
