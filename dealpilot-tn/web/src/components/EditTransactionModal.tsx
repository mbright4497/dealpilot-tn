"use client"
import React, {useState, useEffect} from 'react'

export default function EditTransactionModal({transaction, open, onClose, onSaved}:{transaction:any, open:boolean, onClose:()=>void, onSaved:(tx:any)=>void}){
  const [form, setForm] = useState<any>({})
  useEffect(()=>{ if(transaction) setForm({ client: transaction.client||'', address: transaction.address||'', type: transaction.type||'Buyer', binding: transaction.binding||'', closing: transaction.closing||'', status: transaction.status||'new', earnest_money: (transaction as any).earnest_money||'' }) },[transaction])

  async function handleSave(e:React.FormEvent){
    e.preventDefault()
    try{
      const res = await fetch('/api/transactions/'+transaction.id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ fields: form }) })
      const j = await res.json()
      if(!res.ok || j.error){ alert('Save failed: '+(j.error||res.statusText)); return }
      onSaved(j)
      onClose()
    }catch(err){ console.error(err); alert('Error saving') }
  }

  if(!open) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 text-white">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-lg font-bold">Edit Deal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">×</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Client Name</label>
            <input className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.client||''} onChange={e=>setForm({...form, client:e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Property Address</label>
            <input className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.address||''} onChange={e=>setForm({...form, address:e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Type</label>
              <select className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.type||'Buyer'} onChange={e=>setForm({...form, type:e.target.value})}>
                <option>Buyer</option>
                <option>Seller</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Status</label>
              <select className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.status||'new'} onChange={e=>setForm({...form, status:e.target.value})}>
                <option value="new">new</option>
                <option value="consultation">consultation</option>
                <option value="under_contract">under_contract</option>
                <option value="inspection">inspection</option>
                <option value="appraisal">appraisal</option>
                <option value="clear_to_close">clear_to_close</option>
                <option value="closed">closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Binding Date</label>
              <input type="date" className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.binding||''} onChange={e=>setForm({...form, binding:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Closing Date</label>
              <input type="date" className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.closing||''} onChange={e=>setForm({...form, closing:e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Earnest Money</label>
              <input type="number" className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.earnest_money||''} onChange={e=>setForm({...form, earnest_money:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Possession Date</label>
              <input type="date" className="w-full rounded px-3 py-2 bg-gray-800 border border-gray-700" value={form.possession_date||''} onChange={e=>setForm({...form, possession_date:e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-gray-700 text-gray-300">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-orange-500 rounded text-black font-semibold">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
