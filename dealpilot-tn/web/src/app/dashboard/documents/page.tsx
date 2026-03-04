'use client'
import { useDocuments } from '../../../lib/hooks';
import { useState } from 'react';

import DocumentIntakePanel from '@/components/documents/DocumentIntakePanel'
import ExtractedDataReviewDrawer from '@/components/documents/ExtractedDataReviewDrawer'
import MissingItemsChecklist from '@/components/documents/MissingItemsChecklist'
import React, { useEffect, useState } from 'react'

export default function DocumentsPage(){
  const [extraction, setExtraction] = useState<any|null>(null)

  useEffect(()=>{
    const handler = (e:any)=> setExtraction(e.detail.extraction)
    window.addEventListener('extraction:ready', handler as EventListener)
    return ()=> window.removeEventListener('extraction:ready', handler as EventListener)
  },[])
  const { data, addDocument, removeDocument } = useDocuments();
  const rows = data?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = async () => {
    if (!name) return;
    await addDocument({ name, type, url });
    setName(''); setType(''); setUrl(''); setShowForm(false);
  };

  return (<div>
    <div className="flex justify-between items-center">
      <h1 className="text-xl">Documents</h1>
      <button onClick={()=>setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
        {showForm ? 'Cancel' : '+ Add Document'}
      </button>
    </div>
    {showForm && (
      <div className="mt-4 p-4 border rounded space-y-2">
        <input placeholder="Document Name" value={name} onChange={e=>setName(e.target.value)} className="border p-2 w-full rounded" />
        <input placeholder="Type (e.g. contract, addendum)" value={type} onChange={e=>setType(e.target.value)} className="border p-2 w-full rounded" />
        <input placeholder="URL / Link" value={url} onChange={e=>setUrl(e.target.value)} className="border p-2 w-full rounded" />
        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
      </div>
    )}
    <table className="w-full mt-4"><thead><tr><th>Name</th><th>Type</th><th>URL</th><th></th></tr></thead>
      <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.type}</td>
        <td>{r.url ? <a href={r.url} target="_blank" className="text-blue-500 underline">Open</a> : '-'}</td>
        <td><button onClick={()=>removeDocument(r.id)} className="text-red-500 text-sm">Delete</button></td></tr>))}</tbody></table>
  </div>);
}
