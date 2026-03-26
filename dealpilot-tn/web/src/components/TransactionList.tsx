'use client'
import React, {useState} from 'react'

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString()
}
import { computeDealHealth } from '@/lib/deal-health'
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

export function shouldShowTransactionSkeleton(transactions: Transaction[], loading: boolean) {
  return transactions.length === 0 && loading
}

export function shouldShowTransactionEmptyState(transactions: Transaction[], loading: boolean) {
  return transactions.length === 0 && !loading
}

interface Props {
  transactions: Transaction[]
  onViewChecklist: (txId: number) => void
  onOpenDeal?: (txId: number) => void
  onAddTransaction?: (tx: Transaction) => void
  onDeleteTransaction?: (txId: number) => void
  onStartAdd?: () => void
  loading?: boolean
}
export default function TransactionList({ transactions, onViewChecklist, onOpenDeal, onAddTransaction, onDeleteTransaction, onStartAdd, loading = false }: Props){
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'closing'|'days'|'value'|'updated'>('closing')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [expanded, setExpanded] = useState<number|null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ address: '', client: '', type: 'Buyer', status: 'Active', binding: '', closing: '' })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const showSkeleton = shouldShowTransactionSkeleton(transactions, loading)
  const showEmptyState = shouldShowTransactionEmptyState(transactions, loading)

  let list = transactions.filter(m => filter === 'All' || m.status === filter)
  if(phaseFilter !== 'All') list = list.filter(m=> (m.status||'').toLowerCase() === phaseFilter.toLowerCase())
  if(searchQuery) list = list.filter(m=> (String(m.address||'')+String(m.client||'')).toLowerCase().includes(searchQuery.toLowerCase()))
  if(sortBy === 'closing') list = list.sort((a,b)=> (a.closing? new Date(a.closing).getTime():Infinity) - (b.closing? new Date(b.closing).getTime():Infinity))
  if(sortBy === 'days') list = list.sort((a,b)=> (a.closing? Math.ceil((new Date(a.closing).getTime()-Date.now())/(1000*60*60*24)):9999) - (b.closing? Math.ceil((new Date(b.closing).getTime()-Date.now())/(1000*60*60*24)):9999))
  // value sorting requires purchase_price on transaction; fallback to 0
  if(sortBy === 'value') list = list.sort((a,b)=> (Number((a as any).purchase_price||0)) - (Number((b as any).purchase_price||0)))
  if(sortBy === 'updated') list = list.sort((a:any,b:any)=> (new Date(b.updated_at||b.modified_at||0).getTime()) - (new Date(a.updated_at||a.modified_at||0).getTime()))
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
      {showSkeleton && (
        <div data-testid="transaction-list-skeleton" className="space-y-3">
          {[...Array(6)].map((_,i)=> (
            <div key={i} className="p-4 bg-gray-800 rounded animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}
      {showEmptyState && (
        <div data-testid="transaction-list-empty" className="text-center text-gray-400 py-6">
          No active deals yet. Add one to get started.
        </div>
      )}

      {/* Eva summary bar */}
      <div className="mb-4 p-4 rounded-lg bg-[#061021] border border-white/6">
        {(() => {
          const activeCount = transactions.filter(t=> (t.status||'').toLowerCase() !== 'closed').length
          const needs = transactions.find(t => !t.binding || t.binding === '' )
          const highlight = needs ? `${String(needs.address||'').replace(/\}/g,'') } needs attention — missing binding` : (transactions[0] ? `${String(transactions[0].address||'').replace(/\}/g,'')} is on track` : 'No active deals')

          // pipeline health summary
          try{
            const counts = { green:0, yellow:0, red:0 }
            for(const t of transactions){ try{ const h = computeDealHealth(t); counts[h.color] = (counts[h.color]||0)+1 }catch(e){} }
            const summary = `${counts.green} Green, ${counts.yellow} Yellow, ${counts.red} Red`
            return (
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-300">You have <span className="font-semibold text-white">{activeCount}</span> active deals.</div>
                <div className="text-sm text-gray-300">{highlight}</div>
                <div className="text-sm text-gray-200 font-semibold">{summary}</div>
              </div>
            )
          }catch(e){
            return (
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-300">You have <span className="font-semibold text-white">{activeCount}</span> active deals.</div>
                <div className="text-sm text-gray-300">{highlight}</div>
                <div />
              </div>
            )
          }
        })()}
      </div>

      {/* controls: tabs + search + sort + phase filter */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="inline-flex rounded-full bg-gray-800 p-1">
          {['All','Active','Pending','Closed'].map(p=> (
            <button key={p} onClick={()=>setFilter(p)} className={`px-4 py-1 rounded-full ${filter===p ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300'}`}>{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search address or client" className="bg-[#0f223a] p-2 rounded input text-sm" />
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="bg-[#0f223a] p-2 rounded text-sm">
            <option value="closing">Sort: Closing date</option>
            <option value="days">Sort: Days to close</option>
            <option value="value">Sort: Deal value</option>
            <option value="updated">Sort: Last updated</option>
          </select>
          <select value={phaseFilter} onChange={e=>setPhaseFilter(e.target.value)} className="bg-[#0f223a] p-2 rounded text-sm">
            <option value="All">Phase: All</option>
            <option value="draft">Phase: Draft</option>
            <option value="binding">Phase: Binding</option>
            <option value="inspection_period">Phase: Inspection</option>
            <option value="post_inspection">Phase: Post Inspection</option>
            <option value="closed">Phase: Closed</option>
          </select>
          <button onClick={() => onStartAdd ? onStartAdd() : setShowModal(true)} className="ml-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all text-sm">Add</button>
        </div>
      </div>

      {/* card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map(tx=>{
          const state = (tx.current_state||'').toLowerCase()
          const stateMap:any = { draft:10, active:45, inspection_period:65, post_inspection:80, closed:100 }
          const percent = stateMap[state] ?? (tx.status==='Closed'?100:40)
          const daysToClose = tx.closing ? Math.max(0, Math.ceil((new Date(tx.closing).getTime() - Date.now())/(1000*60*60*24))) : null
          return (
            <div key={tx.id} onClick={()=>{ if(onOpenDeal) { onOpenDeal(tx.id) } else { window.location.href = `/chat?deal=${tx.id}` } }} className="p-4 rounded-lg bg-[#0d1b2a] border border-white/6 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer transition-all">
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
                    <circle cx="18" cy="18" r="10" fill="transparent" stroke="#111827" strokeWidth={4} />
                    {(() => {
                      try{
                        const h = computeDealHealth(tx)
                        const col = h.color === 'green' ? '#16A34A' : h.color === 'yellow' ? '#F59E0B' : '#EF4444'
                        return <circle cx="18" cy="18" r="10" fill="transparent" stroke={col} strokeWidth={4} strokeDasharray={`${percent} 100`} strokeDashoffset={25} strokeLinecap="round" />
                      }catch(e){
                        return <circle cx="18" cy="18" r="10" fill="transparent" stroke="#F97316" strokeWidth={4} strokeDasharray={`${percent} 100`} strokeDashoffset={25} strokeLinecap="round" />
                      }
                    })()}
                    <text x="18" y="20" fill="#fff" fontSize={8} textAnchor="middle" className="font-mono">{percent}%</text>
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

