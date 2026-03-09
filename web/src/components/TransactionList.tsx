'use client'
import React, {useState} from 'react'

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString()
}
import ContractIntake from './ContractIntake'
interface Transaction {
  id: number
  address: string
  client: string
  type: string
  status: string
  binding: string
  closing: string
  state_label?: string
  current_state?: string
}
interface Props {
  transactions: Transaction[]
  onViewChecklist: (txId: number) => void
  onOpenDeal?: (txId: number) => void
  onAddTransaction?: (tx: Transaction) => void
  onDeleteTransaction?: (txId: number) => void
    onStartAdd?: () => void
}
export default function TransactionList({ transactions, onViewChecklist, onOpenDeal, onAddTransaction, onDeleteTransaction, onStartAdd }: Props){
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<number|null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ address: '', client: '', type: 'Buyer', status: 'Active', binding: '', closing: '' })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showIntake, setShowIntake] = useState(false)
  const list = transactions.filter(m => filter === 'All' || m.status === filter)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try{
      const payload = {
        fields: {
          propertyAddress: form.address,
          contractType: form.type.toLowerCase(),
          clientName: form.client,
          bindingDate: form.binding || null,
          closingDate: form.closing || null,
          financingType: form.type || null
        }
      }
      const res = await fetch('/api/transactions/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if(!res.ok || j.error){ alert('Failed to create transaction: '+(j.error||res.statusText)); return }
      const newId = j.id
      const newTx: Transaction = { id: newId, address: form.address, client: form.client, type: form.type, status: 'Active', binding: form.binding, closing: form.closing }
      if (onAddTransaction) { onAddTransaction(newTx) }
      if (onOpenDeal) onOpenDeal(newId)
      setForm({ address: '', client: '', type: 'Buyer', status: 'Active', binding: '', closing: '' })
      setShowModal(false)
      setSuccessMsg('Transaction created')
      setTimeout(()=>setSuccessMsg(null),3000)
    }catch(err){ console.error(err); alert('Error creating transaction') }
  }
  return (
    <div>
      {/* Skeleton when no transactions loaded */}
      {transactions.length === 0 && (
        <div className="space-y-3">
          {[...Array(6)].map((_,i)=> (
            <div key={i} className="p-4 bg-gray-800 rounded animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-100">Transactions</h2>
        <div className="flex items-center gap-3">
          <select onChange={e=>setFilter(e.target.value)} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-2 text-gray-200 hover:border-cyan-500/30 transition-all">
            <option>All</option><option>Active</option><option>Pending</option><option>Closed</option>
          </select>
          <button onClick={() => onStartAdd ? onStartAdd() : setShowModal(true)} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-400 hover:to-amber-400 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 font-semibold">Add Transaction</button>
        </div>
      </div>
      <table className="w-full bg-white/5 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-white/10">
        <thead className="bg-white/5">
          <tr>
            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Address</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Lifecycle</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Binding Date</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Closing Date</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(l => (
            <React.Fragment key={l.id}>
              <tr className="border-b border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all duration-200" onClick={()=>setExpanded(expanded===l.id?null:l.id)}>
                <td className="p-3 font-medium text-gray-100">{(l.address==='}'? '' : l.address)}</td>
                <td className="p-3 text-gray-200">{(l.client==='}'? '' : l.client)}</td>
                <td className="p-3 text-gray-300">{l.type}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${l.current_state === 'closed' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' : l.current_state === 'draft' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : l.current_state === 'inspection_period' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : l.current_state === 'post_inspection' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>{(l as any).state_label || '—'}</span></td>
                
                <td className="p-3 text-gray-400">{l.binding ? formatDate(l.binding) : '—'}</td>
                <td className="p-3 text-gray-400">{l.closing ? formatDate(l.closing) : '—'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Comms badge: shows last comm date and flags overdue (>=3 days) */}
                    {(() => {
                      const badge = (window as any).__commsByTx && (window as any).__commsByTx[l.id]
                      if (badge) {
                        const overdue = badge.overdue
                        return (
                          <div className={`px-2 py-1 text-xs font-semibold rounded-full ${overdue ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-100'}`} title={`Last comm: ${new Date(badge.last_comm).toLocaleString()}`}>
                            {overdue ? `Follow-up ${badge.days_since}d` : `Last: ${new Date(badge.last_comm).toLocaleDateString()}`}
                          </div>
                        )
                      }
                      return <div className="px-2 py-1 text-xs rounded-full bg-white/5 text-gray-300">No comms</div>
                    })()}

                    <div className="flex gap-2">
                      <button onClick={(e)=>{ e.stopPropagation(); onOpenDeal && onOpenDeal(l.id) }} className="px-3 py-1 bg-orange-500/20 text-orange-300 text-sm rounded-lg border border-orange-500/30 hover:bg-orange-500/40 hover:shadow-orange-500/10 hover:shadow-lg transition-all duration-200">Open Deal</button>
                      <button onClick={(e)=>{ e.stopPropagation(); onViewChecklist(l.id) }} className="px-3 py-1 bg-white/5 text-gray-300 text-xs rounded-lg border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 font-medium transition-all duration-200">Checklist</button>
                      <button onClick={(e)=>{ e.stopPropagation(); if(onDeleteTransaction && window.confirm('Delete this transaction?')) onDeleteTransaction(l.id) }} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 text-xs font-medium transition-all duration-200">Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
              {expanded===l.id && (
                <tr>
                  <td colSpan={7} className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10">
                    <div className="text-sm text-gray-300">
                      <p className="font-semibold text-white mb-2">Transaction Details - {(l.address==='}'? '' : l.address)}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <p>Client: <span className="font-medium text-white">{(l.client==='}'? '' : l.client)}</span></p>
                        <p>Type: <span className="font-medium text-white">{l.type}</span></p>
                        <p>Binding: <span className="font-medium text-white">{l.binding ? formatDate(l.binding) : '—'}</span></p>
                        <p>Closing: <span className="font-medium text-white">{l.closing ? formatDate(l.closing) : '—'}</span></p>
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
        <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">{successMsg}</div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Add New Transaction</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Property Address *</label>
                <input type="text" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="e.g. 100 Main St, Johnson City, TN" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client Name *</label>
                <input type="text" required value={form.client} onChange={e => setForm({...form, client: e.target.value})} placeholder="e.g. John Smith" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="Buyer">Buyer</option><option value="Seller">Seller</option></select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"><option value="Active">Active</option><option value="Pending">Pending</option><option value="Closed">Closed</option></select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Binding Date *</label>
                  <input type="date" required value={form.binding} onChange={e => setForm({...form, binding: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Closing Date *</label>
                  <input type="date" required value={form.closing} onChange={e => setForm({...form, closing: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-all">Cancel</button>
                <button type="button" onClick={() => setShowIntake(true)} className="px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-all">Upload Contract</button>
                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 hover:shadow-lg hover:shadow-emerald-500/20 font-semibold transition-all duration-300">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showIntake && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-5xl mx-4">
            <ContractIntake onCancel={()=>setShowIntake(false)} onConfirm={async (parsed:any)=>{
              try{
                // create transaction from parsed extraction
                const payload = {
                  fields: {
                    propertyAddress: parsed.fields.propertyAddress || '',
                    contractType: parsed.fields.contractType || (parsed.fields.contractType==='buyer'?'buyer':'unknown'),
                    clientName: (parsed.fields.buyerNames && parsed.fields.buyerNames.length>0) ? parsed.fields.buyerNames.join(', ') : (parsed.fields.sellerNames||[]).join(', '),
                    bindingDate: parsed.fields.bindingDate || null,
                    closingDate: parsed.fields.closingDate || null,
                    purchasePrice: parsed.fields.purchasePrice || null,
                    earnestMoney: parsed.fields.earnestMoney || null,
                    timeline: parsed.timeline || []
                  },
                  extracted: parsed
                }
                const res = await fetch('/api/transactions/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                const j = await res.json()
                if(!res.ok || j.error){ alert('Failed to create transaction from contract: '+(j.error||res.statusText)); return }
                const newId = j.id
                const newTx: Transaction = { id: newId, address: parsed.fields.propertyAddress||'', client: (parsed.fields.buyerNames&&parsed.fields.buyerNames[0])||'', type: 'Buyer', status: 'Active', binding: parsed.fields.bindingDate || '', closing: parsed.fields.closingDate || '' }
                if (onAddTransaction) onAddTransaction(newTx)
                if (onOpenDeal) onOpenDeal(newId)
                setShowIntake(false)
                setShowModal(false)
                setSuccessMsg('Transaction created from contract')
                setTimeout(()=>setSuccessMsg(null),3000)
              }catch(err){ console.error(err); alert('Error creating transaction from contract') }
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
