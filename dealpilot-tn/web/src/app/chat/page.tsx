'use client'
import React, {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'

import TCDashboard from '@/components/TCDashboard'
import TransactionList from '@/components/TransactionList'
import FormsFillView from '@/components/FormsFillView'
import DeadlineCalculator from '@/components/DeadlineCalculator'
import AIChatbot from '@/components/AIChatbot'
import TransactionDetail from '@/components/TransactionDetail'
import PersonalitySelector from '@/components/PersonalitySelector'
import { getDefaultStyle } from '@/lib/assistant-personality'
import type { AssistantStyle } from '@/lib/assistant-personality'
import VoiceSettings from '@/components/VoiceSettings'
import { previewVoice } from '@/lib/voice-engine'
import TransactionStepper from '@/components/TransactionStepper'
import ContractViewer from '@/components/ContractViewer'
import ContractIntake from '@/components/ContractIntake'
import MobileSidebar from '@/components/MobileSidebar'
import EvaMainView from '@/components/eva/EvaMainView'
import { EvaProvider } from '@/components/eva/EvaProvider'

class DealErrorBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}>{
  constructor(p:any){super(p);this.state={error:null}}
  static getDerivedStateFromError(e:Error){return{error:e}}
  render(){
    if(this.state.error) return (
      <div className="p-6 bg-red-900 border border-red-500 rounded-lg text-white">
        <h3 className="text-lg font-bold text-red-400">Deal View Error</h3>
        <p className="mt-2 text-sm">{this.state.error.message}</p>
        <pre className="mt-2 text-xs overflow-auto max-h-40 bg-black p-2 rounded">{this.state.error.stack}</pre>
        <button onClick={()=>this.setState({error:null})} className="mt-3 px-4 py-2 bg-red-600 rounded text-sm">Retry</button>
      </div>
    )
    return this.props.children
  }
}

export type Contact = {
  role: string
  name: string
  company: string
  phone: string
  email: string
}

export type TimelineEvent = {
  label: string
  date: string | null
  status: 'completed' | 'active' | 'upcoming'
}

export type Transaction = {
  id: number
  address: string
  client: string
  type: 'Buyer' | 'Seller'
  status: 'Active' | 'Pending' | 'Closed'
  binding: string
  closing: string
  contacts: Contact[]
  notes: string
  current_state?: string
  state_label?: string
  binding_date?: string | null
  closing_date?: string | null
  inspection_end_date?: string | null
  purchase_price?: number | null
  earnest_money?: number | null
  seller_names?: string | null
  buyer_names?: string | null
  financing_contingency_date?: string | null
  special_stipulations?: string | null
  contract_type?: string | null
  timeline?: TimelineEvent[]
  issues?: any[]
  documents?: any[]
}

function NavIcon({ name }: { name: string }) {
  const p = { width: 18, height: 18, fill: 'none' as const, viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 }
  if (name === 'dashboard') return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (name === 'transactions') return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  if (name === 'forms') return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  if (name === 'deadlines') return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  if (name === 'ai') return <svg {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  if (name === 'tx-steps') return <svg {...p}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 14l2 2 4-4"/></svg>
  if (name === 'personality') return <svg {...p}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-6 2.69-6 6v1h12v-1c0-3.31-2.69-6-6-6z"/></svg>
  return null
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'deadlines', label: 'Deadlines' },
]


export const dynamic = 'force-dynamic'

export default function ChatPage() {
  const router = useRouter()

  // Command Center state
  const [briefing, setBriefing] = useState<string|null>(null)
  const [actions, setActions] = useState<any[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<number|null>(null)
  const [view, setView] = useState('dashboard')

  const [lastUpdated, setLastUpdated] = useState<Date| null>(null)
  const [toasts, setToasts] = useState<{id:string,msg:string}[]>([])
  const addToast = (msg:string)=>{ const id = String(Date.now()) ; setToasts(t=>[...t,{id,msg}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000) }

  const loadCommandCenter = async ()=>{
    try{
      const b = await fetch('/api/eva/briefing', { method:'POST' })
      if(b.ok){ const bj=await b.json(); setBriefing(bj.message||null) }
      const r = await fetch('/api/eva/actions')
      if(r.ok){ const aj=await r.json(); setActions(aj.actions||[]) }
      const d = await fetch('/api/deal-state/all')
      if(d.ok){ const dj=await d.json(); setTransactions(Array.isArray(dj)?dj:[]) }
      setLastUpdated(new Date())
    }catch(e){ console.warn('command center load',e) }
    setLoading(false)
  }

  useEffect(()=>{ loadCommandCenter(); const iv = setInterval(()=>{ loadCommandCenter() }, 60000); return ()=>clearInterval(iv) },[])

  // helper to execute action
  const executeAction = async (a:any)=>{
    try{
      const res = await fetch('/api/eva/execute-action', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ actionType: a.action, dealId: a.dealId, milestone_key: a.milestone_key }) })
      if(res.ok){ // refresh actions
        const r = await fetch('/api/eva/actions'); if(r.ok){ const aj = await r.json(); setActions(aj.actions||[]) }
        alert(`Done - ${a.action} marked complete for ${a.address}`)
      } else { alert('Failed to execute action') }
    }catch(e){ console.error('execute action error', e); alert('Failed to execute') }
  }

  useEffect(() => {
    fetch('/api/deal-state/all')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTransactions(data
            .filter((d: any) => d.address && String(d.address).trim() && String(d.address).trim() !== '}')
            .map((d: any) => ({
              id: d.id,
              address: d.address || '',
              client: d.client || '',
              type: d.type || 'Buyer',
              status: d.status === 'Closed' ? 'Closed' : d.status === 'draft' ? 'Active' : 'Pending',
              binding: d.binding || '',
              closing: d.closing || '',
              contacts: [],
              notes: '',
              current_state: d.status || 'draft',
              state_label: d.state_label || 'Draft',
              binding_date: d.binding || null,
              closing_date: d.closing || null,
              inspection_end_date: d.inspection_end_date,
              purchase_price: d.purchase_price,
              earnest_money: d.earnest_money,
              seller_names: d.seller_names,
              buyer_names: d.buyer_names,
              financing_contingency_date: d.financing_contingency_date,
              special_stipulations: d.special_stipulations,
              contract_type: d.contract_type,
              timeline: d.timeline || [],
              issues: d.issues || [],
              documents: d.documents || [],
            })))
        }
      })
      .catch(err => console.error('Failed to load deal states:', err))
  }, [])

  async function addTransaction(tx: any) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: tx.address || '',
          client: tx.client || '',
          type: tx.type || 'Buyer',
          status: tx.status || 'Active',
          binding: tx.binding || '',
          closing: tx.closing || '',
          notes: tx.notes || '',
          contacts: JSON.stringify(tx.contacts || []),
          purchase_price: tx.purchase_price || null,
          earnest_money: tx.earnest_money || null,
          seller_names: tx.seller_names || null,
          buyer_names: tx.buyer_names || null,
          inspection_end_date: tx.inspection_end_date || null,
          financing_contingency_date: tx.financing_contingency_date || null,
          special_stipulations: tx.special_stipulations || null,
          contract_type: tx.contract_type || null,
          timeline: JSON.stringify(tx.timeline || []),
          issues: JSON.stringify(tx.issues || []),
          documents: JSON.stringify(tx.documents || []),
        }),
      })
      const newTx = await res.json()
      if (newTx && newTx.id) {
        setTransactions(prev => [...prev, {
          ...newTx,
          contacts: typeof newTx.contacts === 'string' ? JSON.parse(newTx.contacts) : (newTx.contacts || []),
          timeline: typeof newTx.timeline === 'string' ? JSON.parse(newTx.timeline) : (newTx.timeline || []),
          issues: typeof newTx.issues === 'string' ? JSON.parse(newTx.issues) : (newTx.issues || []),
          documents: typeof newTx.documents === 'string' ? JSON.parse(newTx.documents) : (newTx.documents || []),
        }])
      }
    } catch (err) {
      console.error('Failed to add transaction:', err)
    }
  }

  function openDeal(txId: number) {
    setSelectedTxId(txId)
    setView('deal')
  }

  function openChecklist(txId: number) {
    setSelectedTxId(txId)
    setView('deal')
  }

  async function deleteTransaction(txId: number) {
    try {
      await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: txId }),
      })
      setTransactions(prev => prev.filter(t => t.id !== txId))
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    }
  }

  function updateTransactionContacts(txId: number, contacts: any[]) {
    setTransactions(prev => prev.map(t => t.id === txId ? {...t, contacts} : t))
  }

  function handleNavigate(dest: string) {
    if (dest === 'transactions') {
      setSelectedTxId(null)
      setView('transactions')
    } else if (dest === 'forms') {
      setView('forms')
    } else if (dest === 'deadlines') {
      setView('deadlines')
    } else if (dest === 'checklist') {
      setView('transactions')
    } else if (dest === 'ai') {
      setChatOpen(true)
    } else {
      setView(dest)
    }
  }

  const selectedTx = transactions.find(t => t.id === selectedTxId)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/notifications')
        if(!res.ok) return
        const j = await res.json()
        if(!mounted) return
        const list = j.notifications || []
        setUnreadCount(list.filter((n:any)=>!n.read).length)
      }catch(e){}
    })()
    return ()=>{ mounted=false }
  },[])

  // Listen to Eva events for conversation-driven actions
  useEffect(()=>{
    const onViewDeal = (e:any) => { try{ const id = e.detail?.id; if(id) openDeal(Number(id)) }catch(_){ } }
    const onUpload = (e:any) => { try{ const id = e.detail?.dealId; if(id){ setSelectedTxId(Number(id)); setView('add-transaction') } }catch(_){ } }
    const onViewParties = (e:any) => { try{ const id = e.detail?.dealId; if(id){ setSelectedTxId(Number(id)); setView('deal') } }catch(_){ } }
    const onEditDeal = (e:any) => { try{ const id = e.detail?.dealId; if(id){ setSelectedTxId(Number(id)); setView('deal') } }catch(_){ } }
    const onDoAction = async (e:any) => { try{ const detail = e.detail; if(!detail) return; if(detail.id === 'remind-inspector'){ // draft email to inspector
            const draft = `Subject: Reminder — Inspection for ${selectedTx?.address || 'your property'}\n\nHi [Inspector Name],\n\nPlease confirm availability for the inspection for ${selectedTx?.address || ''}. The inspection period ends on ${selectedTx?.inspection_end_date || 'TBD'}. Please reply with available times.\n\nThanks,\n${'Matt'}`
            addMessage({ id:'eva_action_'+Date.now(), role:'eva', content:'I drafted a reminder to the inspector. Review below and tell me to send or edit.', payload: { type:'draft_email', data: { subject: `Reminder — Inspection for ${selectedTx?.address || ''}`, body: draft } } })
          }
          else if(detail.id === 'send-disclosure'){ // draft disclosure email to buyer
            const draft = `Subject: Required Disclosure for ${selectedTx?.address || ''}\n\nHi ${selectedTx?.client || ''},\n\nAttached is the required disclosure for ${selectedTx?.address || ''}. Please review and confirm receipt.\n\nThanks,\n${'Matt'}`
            addMessage({ id:'eva_action_'+Date.now(), role:'eva', content:'I prepared a disclosure email for the buyer. Review and confirm to send.', payload: { type:'draft_email', data: { subject: `Disclosure — ${selectedTx?.address || ''}`, body: draft } } })
          }
          else if(detail.id === 'check-title'){ // draft title inquiry
            const draft = `Subject: Title Commitment Status — ${selectedTx?.address || ''}\n\nHello Title Team,\n\nCould you please provide the current status of the title commitment for ${selectedTx?.address || ''}? We are tracking deadlines and need any exceptions or outstanding requirements.\n\nThanks,\n${'Matt'}`
            addMessage({ id:'eva_action_'+Date.now(), role:'eva', content:'I prepared a title inquiry draft. Review below and tell me to send.', payload: { type:'draft_email', data: { subject: `Title Commitment Status — ${selectedTx?.address || ''}`, body: draft } } })
          }
      }catch(_){ } }
    window.addEventListener('eva:viewDeal', onViewDeal)
    window.addEventListener('eva:uploadDocument', onUpload)
    window.addEventListener('eva:viewParties', onViewParties)
    window.addEventListener('eva:editDeal', onEditDeal)
    window.addEventListener('eva:doAction', onDoAction)
    return ()=>{
      window.removeEventListener('eva:viewDeal', onViewDeal)
      window.removeEventListener('eva:uploadDocument', onUpload)
      window.removeEventListener('eva:viewParties', onViewParties)
      window.removeEventListener('eva:editDeal', onEditDeal)
      window.removeEventListener('eva:doAction', onDoAction)
    }
  }, [transactions])

  return (
    <div className="flex h-screen bg-dp-bg-dark">
      {/* Mobile hamburger */}
      <button onClick={()=>setSidebarOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>

      {/* Sidebar */}
      <aside className="w-60 bg-dp-sidebar flex flex-col border-r border-gray-800 hidden md:flex">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">CP</div>
          <div>
            <h2 className="text-white font-semibold text-sm leading-tight">ClosingPilot TN</h2>
            <p className="text-gray-400 text-xs">Tri-Cities Transaction Coordinator</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedTxId(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                view === item.id ? 'bg-gray-800 text-orange-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <NavIcon name={item.id} />
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setChatOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
          >
            <NavIcon name="ai" />
            AI Assistant
          </button>

          {/* Communications & Settings links */}
          <a href="/communications" className="w-full block flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Communications
            {unreadCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold">{unreadCount}</span>
            )}
          </a>
          <a href="/settings/ghl" className="w-full block flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15v2m0-6v2m0-6v2M4 7h16M4 11h16M4 15h10"/></svg>
            Settings
          </a>
        </nav>
        {selectedTxId && view === 'deal' && (
          <div className="px-4 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Active Deal</p>
            <p className="text-orange-400 text-sm font-medium truncate">{selectedTx?.address}</p>
            <p className="text-gray-400 text-xs">{selectedTx?.client}</p>
          </div>
        )}
        <div className="p-4 border-t border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">MB</div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Matt Bright</p>
            <p className="text-gray-400 text-xs">iHome-KW Kingsport</p>
          </div>
          <button onClick={async ()=>{ try{ await fetch('/api/auth/signout',{ method: 'POST' }); window.location.href='/login' }catch(e){ console.error(e) } }} className="text-sm text-gray-400 hover:text-white p-1 rounded" title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {view === 'dashboard' && (()=>{
          // Command Center layout
          const activeDeals = transactions.filter(t=>{ const s = (t.current_state||t.status||'').toString().toLowerCase(); return s !== 'closed' && s !== 'cancelled' })
          // sort by closing proximity
          activeDeals.sort((a:any,b:any)=>{
            const ad = a.closing ? new Date(a.closing).getTime() : Infinity
            const bd = b.closing ? new Date(b.closing).getTime() : Infinity
            return ad - bd
          })
          return (
            <div>
              {/* Top: Eva briefing card */}
              <div className="mb-6 p-6 rounded-lg bg-[#061021] border border-white/6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-300">Eva Morning Briefing</div>
                    <div className="mt-2 text-white text-lg">{loading? 'Loading briefing...' : (briefing || 'No briefing available')}</div>
                    <div className="text-xs text-gray-400 mt-2">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '—'}</div>

                    {/* structured deals summary (if available) */}
                    {!loading && briefing && Array.isArray((awaitable(briefing)).then?[]:[])}
                  </div>
                  <div>
                    <img src="/avatar-pilot.png" alt="Eva" className="w-16 h-16 rounded-full animate-pulse-slow" />
                  </div>
                </div>
              </div>

              {/* Middle: active deals grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {activeDeals.map((d:any)=>{
                  const daysToClose = d.closing ? Math.ceil((new Date(d.closing).getTime()-Date.now())/(1000*60*60*24)) : null
                  const daysClass = daysToClose===null ? 'text-amber-400' : (daysToClose<=3 ? 'text-red-400' : (daysToClose<=14? 'text-amber-300':'text-green-300'))
                  const progress = playbookProgressMap[d.id] ?? 0
                  return (
                    <div key={d.id} className="p-4 bg-[#0d1b2a] rounded border border-white/6 cursor-pointer hover:shadow-lg transition-all" onClick={()=>openDeal(d.id)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{d.address}</div>
                          <div className="text-sm text-gray-400">{d.client}</div>
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${d.status==='Closed' ? 'bg-gray-500/20 text-gray-300' : d.status==='Pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>{d.status}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-300">Closing</div>
                          <div className={`font-semibold ${daysClass}`}>{d.closing ? new Date(d.closing).toLocaleDateString() : 'No closing date'}</div>
                        </div>
                        <div className="w-1/3">
                          <div className="text-xs text-gray-300">Playbook Progress</div>
                          <div className="w-full bg-gray-700 h-2 rounded mt-1"><div className="h-2 rounded bg-cyan-400" style={{width:`${Math.min(100,Math.max(0,progress))}%`}} /></div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">{progress}% complete</div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom: Eva's Actions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Eva's Actions</h3>
                <div className="flex gap-3 flex-wrap">
                  {actions.map((a:any, idx:number)=> (
                    <div key={`${a.dealId}-${a.milestone_key||a.action}`} className={`p-3 bg-[#0f1c2e] rounded border border-white/6 w-full md:w-1/3 transform transition-all duration-500 ${idx<3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-80'}`} style={{animation: `slideIn 400ms ${idx*80}ms ease both`}}>
                      <div className="font-semibold text-white">{a.action}</div>
                      <div className="text-sm text-gray-400">{a.address}</div>
                      <div className="text-xs text-gray-500 mt-2">{a.reason || ''}</div>
                      <div className="mt-3">
                        <button onClick={async ()=>{ const res = await fetch('/api/eva/execute-action', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ actionType: a.action, dealId: a.dealId, milestone_key: a.milestone_key }) }); if(res.ok){ const j=await res.json(); // refresh actions
                          const r = await fetch('/api/eva/actions'); if(r.ok){ const aj = await r.json(); setActions(aj.actions||[]) } addToast(`Done - ${a.action} marked complete for ${a.address}`) } else { addToast('Failed to execute action') } }} className="px-3 py-1 bg-orange-500 rounded">Do it</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
        {view === 'transactions' && (<>
            <button onClick={() => setView('dashboard')} className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white text-sm"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Dashboard </button>
            <TransactionList transactions={transactions} onViewChecklist={openChecklist} onOpenDeal={openDeal} onAddTransaction={addTransaction} onStartAdd={() => setView('add-transaction')} onDeleteTransaction={deleteTransaction} /></>)}
        {view === 'deal' && selectedTx && <DealErrorBoundary><TransactionDetail transaction={selectedTx} onBack={() => setView('transactions')} onUpdateContacts={updateTransactionContacts} /></DealErrorBoundary>}
        {view === 'forms' && (<>
          <button onClick={() => setView('dashboard')} className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white text-sm"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Dashboard </button>
          <FormsFillView />
        </>)}
        {view === 'deadlines' && (<>
          <button onClick={() => setView('dashboard')} className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white text-sm"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Dashboard </button>
          <DeadlineCalculator />
        </>)}         {view === 'tx-steps' && (<>
          <button onClick={() => setView('dashboard')} className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white text-sm"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Dashboard </button>
          <div className="grid lg:grid-cols-2 gap-6"><TransactionStepper /><ContractViewer contract={{propertyAddress:'123 Maple St, Johnson City TN',buyers:'John Smith, Jane Smith',sellers:'Bob Johnson',purchasePrice:425000,earnestMoney:5000,closingDate:'2026-05-30',inspectionStart:'2026-03-01',inspectionEnd:'2026-03-10',financingDate:'2026-04-15',specialStipulations:'Seller to repair roof prior to closing.'}} /></div></>) }
        {view === 'personality' && <><PersonalitySelector currentStyle={assistantStyle} onSelect={(style)=>setAssistantStyle(style)} /><div className="mt-6"><VoiceSettings voiceEnabled={voiceEnabled} onToggle={setVoiceEnabled} currentStyle={assistantStyle} onPreview={previewVoice} /></div></>}
              {view === 'add-transaction' && <ContractIntake onConfirm={async (data: any) => {
                try{
                  const res = await fetch('/api/transactions/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) })
                  const j = await res.json()
                  if (!res.ok) { const msg = j?.error || 'Failed to create transaction'; alert(msg); return }
                  const newId = j.id
                  if (newId) {
                    // refresh deal-state or optimistically add
                    const txRes = await fetch(`/api/deal-state/${newId}`)
                    if (txRes.ok){ const tx = await txRes.json(); setTransactions(prev=>[...prev, tx]) }
                    setView('transactions')
                    alert('Transaction created')
                  }
                }catch(e:any){ console.error(e); alert('Error creating transaction: '+String(e)) }
              }} onCancel={() => setView('transactions')} />}
      </main>

      {/* Floating chat button */}
      <button onClick={() => setChatOpen(true)} className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center overflow-hidden border-2 border-orange-500 hover:border-orange-400 p-0" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40 }}>
        <img src="/avatar-pilot.png" alt="Eva" className="w-10 h-10 rounded-full object-cover" />
      </button>
      {chatOpen && <AIChatbot onClose={() => setChatOpen(false)} style={assistantStyle} voiceEnabled={voiceEnabled} />}
    </div>
  )
}