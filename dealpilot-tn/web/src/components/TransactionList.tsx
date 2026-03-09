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
      {/* skeleton */}
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

      {/* Eva summary bar */}
      <div className="mb-4 p-4 rounded-lg bg-[#061021] border border-white/6">
        {(() => {
          const activeCount = transactions.filter(t=> (t.status||'').toLowerCase() !== 'closed').length
          const needs = transactions.find(t => !t.binding || t.binding === '' )
          const highlight = needs ? `${String(needs.address||'').replace(/\}/g,'') } needs attention — missing binding` : (transactions[0] ? `${String(transactions[0].address||'').replace(/\}/g,'')} is on track` : 'No active deals')
          return (
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-gray-300">You have <span className="font-semibold text-white">{activeCount}</span> active deals.</div>
              <div className="text-sm text-gray-300">{highlight}</div>
              <div />
            </div>
          )
        })()}
      </div>

      {/* pill tabs */}
      <div className="mb-4">
        <div className="inline-flex rounded-full bg-gray-800 p-1">
          {['All','Active','Pending','Closed'].map(p=> (
            <button key={p} onClick={()=>setFilter(p)} className={`px-4 py-1 rounded-full ${filter===p ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300'}`}>{p}</button>
          ))}
        </div>
        <button onClick={() => onStartAdd ? onStartAdd() : setShowModal(true)} className="ml-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all">Add Transaction</button>
      </div>

      {/* card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map(tx=>{
          const state = (tx.current_state||'').toLowerCase()
          const stateMap:any = { draft:10, active:45, inspection_period:65, post_inspection:80, closed:100 }
          const percent = stateMap[state] ?? (tx.status==='Closed'?100:40)
          const daysToClose = tx.closing ? Math.max(0, Math.ceil((new Date(tx.closing).getTime() - Date.now())/(1000*60*60*24))) : null
          return (
            <div key={tx.id} onClick={()=>{ if(onOpenDeal) onOpenDeal(tx.id) }} className="p-4 rounded-lg bg-[#0d1b2a] border border-white/6 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-white">{String(tx.address||'').replace(/\}/g,'')}</div>
                  <div className="text-sm text-gray-300">{String(tx.client||'').replace(/\}/g,'')}</div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.current_state==='closed' ? 'bg-gray-500/20 text-gray-300' : tx.current_state==='draft' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>{(tx as any).state_label||tx.status||'—'}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <svg className="w-12 h-12" viewBox="0 0 36 36">
                    <path className="text-gray-800" d="M18 2a16 16 0 1 0 16 16A16 16 0 0 0 18 2" fill="#0f1724"/>
                    <path className="text-orange-400" d="M18 2a16 16 0 1 0 16 16A16 16 0 0 0 18 2" stroke="#0f1724" stroke-width="0" fill="none"/>
                    <circle cx="18" cy="18" r="10" fill="transparent" stroke="#111827" stroke-width="4"/>
                    <circle cx="18" cy="18" r="10" fill="transparent" stroke="#F97316" stroke-width="4" stroke-dasharray={`${percent} 100`} stroke-dashoffset="25" stroke-linecap="round"/>
                    <text x="18" y="20" fill="#fff" font-size="8" text-anchor="middle" className="font-mono">{percent}%</text>
                  </svg>
                  <div className="text-sm text-gray-300">
                    <div>Days to close</div>
                    <div className="font-semibold text-white">{daysToClose===null? 'TBD' : `${daysToClose}d`}</div>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <div>Closing</div>
                  <div className="font-semibold text-white">{tx.closing ? formatDate(tx.closing) : '—'}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

