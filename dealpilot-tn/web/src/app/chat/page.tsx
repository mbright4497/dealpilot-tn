'use client'
import React, {useState, useEffect} from 'react'
import { speakAPI as speakText, stopSpeaking, isSpeaking } from '@/lib/voice-engine'
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

import ContractViewer from '@/components/ContractViewer'
import ContractIntake from '@/components/ContractIntake'
import MobileSidebar from '@/components/MobileSidebar'
import EvaMainView from '@/components/eva/EvaMainView'
import { EvaProvider } from '@/components/eva/EvaProvider'
import ClosingPilotLogo from '@/components/ClosingPilotLogo'
import ContractWatch from '@/components/ContractWatch'
import SmartIntakeCard from '@/components/SmartIntakeCard'

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

  // conversation state for dashboard chat
  const [chatMode, setChatMode] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role:'user'|'assistant',content:string, attachments?:any, showUpload?:boolean, parsed?:any}[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const chatRef = React.useRef<HTMLDivElement|null>(null)

  const [lastUpdated, setLastUpdated] = useState<Date| null>(null)
  const [toasts, setToasts] = useState<{id:string,msg:string}[]>([])
  const addToast = (msg:string)=>{ const id = String(Date.now()) ; setToasts(t=>[...t,{id,msg}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000) }

  // scroll chat to bottom when messages change
  useEffect(()=>{
    try{ if(chatRef.current){ chatRef.current.scrollTop = chatRef.current.scrollHeight } }catch(_){ }
  },[chatMessages, chatLoading])

  // missing state declarations fixed
  const [playbookProgressMap, setPlaybookProgressMap] = useState<Record<number,number>>({})
  const [assistantStyle, setAssistantStyle] = useState<AssistantStyle>(getDefaultStyle())
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [evaSpeaking, setEvaSpeaking] = useState(false)
  const [voiceAutoPlay, setVoiceAutoPlay] = useState(()=>{ try{ return typeof window !== 'undefined' ? localStorage.getItem('eva-voice-auto') !== 'false' : true }catch(e){ return true } })
  // addMessage is used by some EVA event handlers — provide a no-op fallback here (real addMessage exists in EvaProvider consumer contexts)
  const addMessage = (m:any)=>{ /* noop fallback to avoid runtime errors when handlers fire outside provider */ }

  const loadCommandCenter = async ()=>{
    try{
      const b = await fetch('/api/eva/briefing', { method:'POST' })
      if(b.ok){ const bj=await b.json(); setBriefing(bj.summary||bj.message||null) }
      const r = await fetch('/api/eva/actions')
      if(r.ok){ const aj=await r.json(); setActions(aj.actions||[]) }
      const d = await fetch('/api/deal-state/all')
      if(d.ok){ const dj=await d.json(); setTransactions(Array.isArray(dj)?dj:[]) }
      setLastUpdated(new Date())
    }catch(e){ console.warn('command center load',e) }
    setLoading(false)
  }

  useEffect(()=>{ loadCommandCenter(); const iv = setInterval(()=>{ loadCommandCenter() }, 60000); return ()=>clearInterval(iv) },[])

  // unified send helper for dashboard chat
  async function sendDashboardMessage(val:string){
    if(!val) return
    setChatMode(true)
    setChatMessages(m=>[...m, { role: 'user', content: val }])
    try{
      // clear input field if present
      const inp = document.querySelector('input[name="ask"]') as HTMLInputElement | null
      if(inp) inp.value = ''
    }catch(_){ }
    setChatLoading(true)
    try{
      // build full conversation payload from chatMessages + new user message
      const history = [...chatMessages.map(c=> ({ role: c.role==='assistant'?'assistant':'user', content: c.content } )), { role: 'user', content: val }]
      const res = await fetch('/api/eva/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ messages: history }) })
      if(res.ok){ const j = await res.json(); const reply = j.reply || j.message || j.summary || '';
        setChatMessages(m=>[...m, { role: 'assistant', content: reply, showUpload: /upload|purchase & sale agreement/i.test(String(reply).toLowerCase()) }])
      }
    }catch(e){ console.error(e); addToast('Chat failed') }
    finally{ setChatLoading(false) }
  }

  // inline upload handler used when Reva asks user to upload a contract
  async function handleInlineUpload(ev:any){
    const f = ev.target.files && ev.target.files[0]
    if(!f) return
    try{
      setChatLoading(true)
      const buf = await f.arrayBuffer()
      const b64 = Buffer.from(buf).toString('base64')
      const res = await fetch('/api/contract-parse', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ fileBase64: b64 }) })
      const j = await res.json()
      const parsedSummary = j
      // append parsed summary as assistant message
      setChatMessages(m=>[...m, { role:'assistant', content: parsedSummary.summary || 'Parsed contract', parsed: parsedSummary }])
    }catch(e){ console.error(e); addToast('Failed to parse file') }
    finally{ setChatLoading(false); ev.target.value = '' }
  }

  // compute playbook completion percent for active deals
  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const map: Record<number, number> = {}
        for(const d of transactions){
          try{
            const res = await fetch('/api/eva/playbook-gaps', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: d.id }), credentials: 'include' })
            if(!res.ok) continue
            const j = await res.json()
            const gaps = j.results && j.results[0] ? j.results[0].gaps || [] : []
            if(gaps.length===0){ map[d.id]=0; continue }
            const completed = gaps.filter((g:any)=> g.status==='completed').length
            const pct = Math.round((completed/gaps.length)*100)
            map[d.id]=pct
          }catch(_){ }
        }
        if(mounted) setPlaybookProgressMap(map)
      }catch(e){ console.warn('playbook progress map error', e) }
    })()
    return ()=>{ mounted = false }
  },[transactions])


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
      <style>{`@keyframes pulseRing{0%{transform:scale(1);opacity:0.9}50%{transform:scale(1.06);opacity:0.5}100%{transform:scale(1);opacity:0.9}}@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Mobile hamburger */}
      <button onClick={()=>setSidebarOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>

      {/* Sidebar */}
      <aside className="w-60 bg-dp-sidebar flex flex-col border-r border-gray-800 hidden md:flex">
        <div className="p-4 flex items-center gap-3">
          <ClosingPilotLogo size="sm" />
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
          // EVA-first hero + ticker layout
          const activeDeals = transactions.filter(t=>{ const s = ((t as any).current_state || (t as any).state_label || t.status || '').toString().toLowerCase(); return s !== 'closed' && s !== 'cancelled' })
          activeDeals.sort((a:any,b:any)=>{
            const ad = a.closing_date ? new Date(a.closing_date).getTime() : Infinity
            const bd = b.closing_date ? new Date(b.closing_date).getTime() : Infinity
            return ad - bd
          })
          return (
            <div className="min-h-[80vh] flex flex-col">
              {/* TOP HALF - Eva's Zone */}
<div className="flex-1 rounded-lg mb-4 bg-gradient-to-b from-[#031023] via-[#04172a] to-[#071a2f] flex flex-col items-center justify-center text-center p-8">
 {/* Avatar + glow + talking animation */}
 <div className="relative flex flex-col items-center">
 <div
 className={
 "absolute -inset-2 rounded-full bg-gradient-to-r from-orange-400/30 via-pink-400/20 to-indigo-400/10 blur-xl " +
 (evaSpeaking ? "animate-pulse-slow" : "")
 }
 style={{ width: 220, height: 220 }}
 />
 <ClosingPilotLogo size="lg" />
 <img
 src="/avatar-pilot.png"
 alt="Reva"
 className="w-56 h-56 rounded-full relative z-10 shadow-2xl"
 style={evaSpeaking ? { animation: "evaTalk 0.9s ease-in-out infinite" } : {}}
 />
 {evaSpeaking && (
 <div className="mt-3 flex items-end gap-1 justify-center h-6">
 <div
 style={{
 width: 4,
 background: "#fb923c",
 borderRadius: 4,
 animation: "soundWave 600ms ease-in-out infinite",
 }}
 />
 <div
 style={{
 width: 4,
 background: "#fb923c",
 borderRadius: 4,
 animation: "soundWave 600ms ease-in-out 150ms infinite",
 }}
 />
 <div
 style={{
 width: 4,
 background: "#fb923c",
 borderRadius: 4,
 animation: "soundWave 600ms ease-in-out 300ms infinite",
 }}
 />
 </div>
 )}
 </div>

 {/* Briefing / Conversational area */}
 <div className="mt-6 max-w-3xl w-full">
   <div className="bg-[#071827] rounded-xl p-6 block text-left max-h-[280px] overflow-y-auto">
     {(chatMessages.length === 0) && (
       <div>
         <div
           className="text-base md:text-lg font-normal leading-relaxed text-white"
           dangerouslySetInnerHTML={{
             __html: (loading ? "Reva is getting ready..." : (briefing || "No briefing available"))
               .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
               .replace(/\n/g, "<br/>"),
           }}
         />
         <div className="text-sm text-gray-400 mt-3">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "—"}</div>
       </div>
     )}

     {(chatMessages.length > 0) && (
       <div className="text-base md:text-lg font-normal leading-relaxed text-white">
         {chatMessages.length===0 && <div className="text-gray-400">No messages yet — say hello to Reva.</div>}
         <div ref={chatRef} className="max-h-[220px] overflow-y-auto">
           {chatMessages.map((m, idx) => (
             <div key={idx} className={`mb-3 flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
               <div className="flex flex-col items-start">
                 <div className={`text-xs text-gray-400 mb-1 ${m.role==='user' ? 'text-right' : 'text-left'}`}>{m.role==='user' ? 'You' : 'Reva'}</div>
                 <div className={`${m.role==='user' ? 'bg-[#0b1a2b] text-white' : 'bg-[#081827] text-white'} px-3 py-2 rounded-lg max-w-[80%]`}>{m.content}</div>
                 {m.showUpload && (
                   <div className="mt-2">
                     <button onClick={()=>{ const el = document.getElementById('inline-upload') as HTMLInputElement|null; if(el) el.click() }} className="mt-2 px-3 py-1 rounded bg-orange-500 text-black">Upload Contract PDF</button>
                   </div>
                 )}
                 {m.parsed && (
                   <div className="mt-2 bg-[#071224] border border-gray-800 p-2 rounded">
                     <div className="font-semibold text-white">{m.parsed.fields?.propertyAddress || 'Address not found'}</div>
                     <div className="text-sm text-gray-300">Buyers: <span className="font-medium">{m.parsed.fields?.buyerNames || '—'}</span></div>
                     <div className="mt-2">
                       <button onClick={async ()=>{
                         try{
                           const res = await fetch('/api/intake-apply', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ fields: m.parsed.fields, timeline: m.parsed.timeline }) })
                           const j = await res.json()
                           if(res.ok && j.success){ setChatMessages(cm=>[...cm, { role:'assistant', content: 'Deal created! You can view it in your Transactions.' }]) }
                         }catch(e){ console.error(e) }
                       }} className="px-3 py-1 rounded bg-green-600 text-white">Create Deal</button>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           ))}
           {chatLoading && <div className="text-gray-400">Reva is thinking...</div>}
         </div>
       </div>
     )}
   </div>
 </div>

 {/* Controls: play/stop + input + refresh */}
 <div className="mt-6 flex items-center gap-4">
 <button
 onClick={async () => {
 try {
 // If there's a message in the input, treat this as a send action
 const inp = document.querySelector('input[name="ask"]') as HTMLInputElement | null
 const val = inp?.value?.trim()
 if(val){ await sendDashboardMessage(val); return }
 if (evaSpeaking) {
 stopSpeaking();
 setEvaSpeaking(false);
 return;
 }
 if (!briefing) return;
 await speakText(briefing, "friendly-tn", () => setEvaSpeaking(true), () =>
 setEvaSpeaking(false)
 );
 } catch (e) {
 console.error(e);
 setEvaSpeaking(false);
 }
 }}
 className={
 "w-12 h-12 rounded-full flex items-center justify-center text-white " +
 (evaSpeaking
 ? "bg-orange-500 animate-pulse"
 : "bg-[#0f1724] border border-white/10 hover:border-orange-400/60 transition")
 }
 title={evaSpeaking ? "Stop Reva" : "Play Reva briefing"}
 >
 {evaSpeaking ? "⏹" : "▶️"}
 </button>

 <form
 onSubmit={async (e) => {
 e.preventDefault();
 const val = (e.target as any).elements.ask.value;
 if (!val) return;
 // append user message, clear input, switch to chat mode
 setChatMode(true)
 setChatMessages(m=>[...m, { role: 'user', content: val }])
 try { (e.target as any).elements.ask.value = '' }catch(_){ }
 setChatLoading(true)
 try {
 const payload = { messages: chatMessages.map(c=> ({ role: c.role==='assistant'?'assistant':'user', content: c.content })).concat([{ role: 'user', content: val }]) }
 const res = await fetch("/api/eva/chat", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(payload),
 });
 if (res.ok) {
 const j = await res.json();
 const reply = j.reply || j.message || j.summary || '';
 setChatMessages(m=>[...m, { role: 'assistant', content: reply, showUpload: /upload|purchase & sale agreement/i.test(reply.toLowerCase()) }])
 addToast("Reva replied");
 }
 } catch (err) {
 console.error(err);
 addToast("Chat failed");
 } finally { setChatLoading(false) }
 }}
 className="flex-1"
 >
 <input
 name="ask"
 placeholder="Ask Reva anything..."
className="px-4 py-3 rounded-full bg-[#0b1a2b] w-[600px] max-w-full placeholder:text-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
 />
 </form>

 <button
 onClick={async () => {
 try {
 stopSpeaking();
 setEvaSpeaking(false);
 setChatMode(false);
 await loadCommandCenter();
 } catch (e) {
 console.error(e);
 }
 }}
 className="px-3 py-2 bg-gray-800 rounded text-sm hover:bg-gray-700 transition"
 >
 Refresh
 </button>
 </div>

 {/* Local keyframes */}
 <style jsx>{`
 @keyframes evaTalk {
 0% {
 transform: scale(1);
 }
 50% {
 transform: scale(1.06);
 }
 100% {
 transform: scale(1);
 }
 }
 @keyframes soundWave {
 0% {
 height: 4px;
 }
 50% {
 height: 16px;
 }
 100% {
 height: 4px;
 }
 }
 `}</style>
</div>

              {/* BOTTOM HALF - Deal ticker + action pills */}
              <div className="h-44 bg-[#071224] rounded-lg p-4">
                <div className="mb-2 text-sm text-gray-400">Deal Ticker</div>
                <div className="flex gap-3 overflow-x-auto py-2">
                  {activeDeals.map((d:any)=>{
                    const days = d.closing_date ? Math.ceil((new Date(d.closing_date).getTime()-Date.now())/(1000*60*60*24)) : null
                    const daysClass = days===null ? 'text-amber-400' : (days<=3 ? 'text-red-400' : (days<=14? 'text-amber-300':'text-green-300'))
                    const progress = playbookProgressMap[d.id] ?? 0
                    return (
                      <div key={d.id} onClick={()=>openDeal(d.id)} className="min-w-[220px] cursor-pointer p-3 bg-[#0f1c2e] rounded border border-white/6">
                        <div className="font-semibold text-white">{d.address}</div>
                        <div className="text-xs text-gray-400">{d.client} • <span className={daysClass}>{days!==null? `${days}d` : 'No close'}</span></div>
                        <div className="mt-2 w-full bg-gray-700 h-2 rounded"><div className="h-2 bg-cyan-400 rounded" style={{width:`${progress}%`}} /></div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3">
                  <div className="text-sm text-gray-300 mb-2">Reva's Actions</div>
                  <div className="flex gap-2">
                    {actions.length===0 ? <div className="text-gray-400">All caught up! No pending actions.</div> : actions.map((a:any)=> (
                      <button key={`${a.dealId}-${a.milestone_key||a.action}`} onClick={async ()=>{ const res = await fetch('/api/eva/execute-action', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ actionType: a.action, dealId: a.dealId, milestone_key: a.milestone_key }) }); if(res.ok){ const r = await fetch('/api/eva/actions'); if(r.ok){ const aj = await r.json(); setActions(aj.actions||[]) } addToast(`Done - ${a.action} for ${a.address}`) } else addToast('Failed') }} className={`px-3 py-1 rounded-full text-sm ${a.urgency==='critical' ? 'bg-red-600 text-white' : a.urgency==='high' ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>{a.action} • {a.address}</button>
                    ))}
                  </div>
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
          <div className="grid lg:grid-cols-2 gap-6"><ContractViewer contract={{propertyAddress:'123 Maple St, Johnson City TN',buyers:'John Smith, Jane Smith',sellers:'Bob Johnson',purchasePrice:425000,earnestMoney:5000,closingDate:'2026-05-30',inspectionStart:'2026-03-01',inspectionEnd:'2026-03-10',financingDate:'2026-04-15',specialStipulations:'Seller to repair roof prior to closing.'}} /></div></>) }
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
        <input id="inline-upload" type="file" accept="application/pdf" className="hidden" onChange={(e)=>handleInlineUpload(e)} />
</main>

      {/* Floating chat button */}
      <button onClick={() => setChatOpen(true)} className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center overflow-hidden border-2 border-orange-500 hover:border-orange-400 p-0" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40 }}>
        <img src="/avatar-pilot.png" alt="Reva" className="w-10 h-10 rounded-full object-cover" />
      </button>
      {chatOpen && <AIChatbot onClose={() => setChatOpen(false)} style={assistantStyle} voiceEnabled={voiceEnabled} />}
    </div>
  )
}
