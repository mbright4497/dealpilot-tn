'use client'
import React, {useState} from 'react'
interface Transaction {
  id: number
  address: string
  client: string
  type: string
  status: string
  binding: string
  closing: string
}
interface Props {
  transactions: Transaction[]
  onViewChecklist: (txId: number) => void
  onOpenDeal?: (txId: number) => void
  onAddTransaction?: (tx: Transaction) => void
  onDeleteTransaction?: (txId: number) => void
}
export default function TransactionList({ transactions, onViewChecklist, onOpenDeal, onAddTransaction, onDeleteTransaction }: Props){
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<number|null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ address: '', client: '', type: 'Buyer', status: 'Active', binding: '', closing: '' })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const list = transactions.filter(m => filter === 'All' || m.status === filter)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newTx: Transaction = { id: Date.now(), ...form }
    if (onAddTransaction) { onAddTransaction(newTx) }
    setForm({ address: '', client: '', type: 'Buyer', status: 'Active', binding: '', closing: '' })
    setShowModal(false)
    setSuccessMsg('Transaction saved')
    setTimeout(()=>setSuccessMsg(null),3000)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
        <div className="flex items-center gap-3">
          <select onChange={e=>setFilter(e.target.value)} className="border border-gray-300 rounded p-2 text-gray-700">
            <option>All</option><option>Active</option><option>Pending</option><option>Closed</option>
          </select>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold">Add Transaction</button>
        </div>
      </div>
      <table className="w-full bg-white shadow rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Address</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Client</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Type</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Binding Date</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Closing Date</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(l => (
            <React.Fragment key={l.id}>
              <tr className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={()=>setExpanded(expanded===l.id?null:l.id)}>
                <td className="p-3 font-medium text-gray-900">{l.address}</td>
                <td className="p-3 text-gray-900">{l.client}</td>
                <td className="p-3 text-gray-800">{l.type}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${l.status==='Active' ? 'bg-green-100 text-green-700' : l.status==='Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{l.status}</span>
                </td>
                <td className="p-3 text-gray-700">{l.binding ? new Date(l.binding).toLocaleDateString() : '—'}</td>
                <td className="p-3 text-gray-700">{l.closing ? new Date(l.closing).toLocaleDateString() : '—'}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={(e)=>{ e.stopPropagation(); onOpenDeal && onOpenDeal(l.id) }} className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors">Open Deal</button>
                    <button onClick={(e)=>{ e.stopPropagation(); onViewChecklist(l.id) }} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">Checklist</button>
                    <button onClick={(e)=>{ e.stopPropagation(); if(onDeleteTransaction && window.confirm('Delete this transaction?')) onDeleteTransaction(l.id) }} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Delete</button>
                  </div>
                </td>
              </tr>
              {expanded===l.id && (
                <tr>
                  <td colSpan={7} className="p-4 bg-gray-50 border-b">
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold text-gray-900 mb-2">Transaction Details - {l.address}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <p>Client: <span className="font-medium text-gray-900">{l.client}</span></p>
                        <p>Type: <span className="font-medium text-gray-900">{l.type}</span></p>
                        <p>Binding: <span className="font-medium text-gray-900">{l.binding ? new Date(l.binding).toLocaleDateString() : '—'}</span></p>
                        <p>Closing: <span className="font-medium text-gray-900">{l.closing ? new Date(l.closing).toLocaleDateString() : '—'}</span></p>
                      </div>
                      <button onClick={()=>onViewChecklist(l.id)} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">Open Transaction Checklist</button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {successMsg && (
        <div className="mb-3 p-3 rounded bg-green-50 border border-green-100 text-green-800 text-sm">{successMsg}</div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Add New Transaction</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Address *</label>
                <input type="text" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="e.g. 100 Main St, Johnson City, TN" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input type="text" required value={form.client} onChange={e => setForm({...form, client: e.target.value})} placeholder="e.g. John Smith" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"><option value="Buyer">Buyer</option><option value="Seller">Seller</option></select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"><option value="Active">Active</option><option value="Pending">Pending</option><option value="Closed">Closed</option></select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Binding Date *</label>
                  <input type="date" required value={form.binding} onChange={e => setForm({...form, binding: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date *</label>
                  <input type="date" required value={form.closing} onChange={e => setForm({...form, closing: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
