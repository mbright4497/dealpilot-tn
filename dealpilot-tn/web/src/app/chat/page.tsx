'use client'
import React, { useState, useEffect } from 'react'
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
  timeline?: TimelineEvent[]
}

function NavIcon({ name }: { name: string }) {
  const p = { width: 18, height: 18, fill: 'none' as const, viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 }
  if (name === 'dashboard') return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (name === 'transactions') return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  if (name === 'forms') return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  if (name === 'deadlines') return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  if (name === 'ai') return <svg {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  if (name === 'tx-steps') return <svg {...p}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 14l2 2 4-4"/></svg>   if (name === 'personality') return <svg {...p}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-6 2.69-6 6v1h12v-1c0-3.31-2.69-6-6-6z"/></svg>
  return null
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'forms', label: 'Forms Library' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'tx-steps', label: 'TX Steps' },   { id: 'personality', label: 'Style' },
]

export default function ChatPage() {
  const [view, setView] = useState('dashboard')
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<number|null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [assistantStyle, setAssistantStyle] = useState<AssistantStyle>(getDefaultStyle())
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  useEffect(() => {
    fetch('/api/deal-state/all')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTransactions(data.map((d: any) => ({
            id: d.id,
            address: d.address || '',
            client: d.client || '',
            type: d.type || 'Buyer',
            status: d.current_state === 'closed' ? 'Closed' : d.current_state === 'draft' ? 'Active' : 'Pending',
            binding: d.binding_date || '',
            closing: d.closing_date || '',
            contacts: [],
            notes: '',
            current_state: d.current_state || 'draft',
            state_label: d.state_label || 'Draft',
            binding_date: d.binding_date,
            closing_date: d.closing_date,
            inspection_end_date: d.inspection_end_date,
            purchase_price: d.purchase_price,
            timeline: d.timeline || [],
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
        }),
      })
      const newTx = await res.json()
      if (newTx && newTx.id) {
        setTransactions(prev => [...prev, {
          ...newTx,
          contacts: typeof newTx.contacts === 'string' ? JSON.parse(newTx.contacts) : (newTx.contacts || []),
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

  return (
    <div className="flex h-screen bg-dp-bg-dark">
      {/* Sidebar */}
      <aside className="w-60 bg-dp-sidebar flex flex-col border-r border-gray-800">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">DP</div>
          <div>
            <h2 className="text-white font-semibold text-sm leading-tight">DealPilot TN</h2>
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
          <div>
            <p className="text-white text-sm font-medium">Matt Bright</p>
            <p className="text-gray-400 text-xs">iHome-KW Kingsport</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {view === 'dashboard' && <TCDashboard transactions={transactions} onNavigate={handleNavigate} onOpenDeal={openDeal} style={assistantStyle} />}
        {view === 'transactions' && <TransactionList transactions={transactions} onViewChecklist={openChecklist} onOpenDeal={openDeal} onAddTransaction={addTransaction} onDeleteTransaction={deleteTransaction} />}
        {view === 'deal' && selectedTx && <DealErrorBoundary><TransactionDetail transaction={selectedTx} onBack={() => setView('transactions')} onUpdateContacts={updateTransactionContacts} /></DealErrorBoundary>}
        {view === 'forms' && <FormsFillView />}
        {view === 'deadlines' && <DeadlineCalculator />}         {view === 'tx-steps' && <div className="grid lg:grid-cols-2 gap-6"><TransactionStepper /><ContractViewer contract={{propertyAddress:'123 Maple St, Johnson City TN',buyers:'John Smith, Jane Smith',sellers:'Bob Johnson',purchasePrice:425000,earnestMoney:5000,closingDate:'2026-05-30',inspectionStart:'2026-03-01',inspectionEnd:'2026-03-10',financingDate:'2026-04-15',specialStipulations:'Seller to repair roof prior to closing.'}} /></div>}
        {view === 'personality' && <>
          <PersonalitySelector currentStyle={assistantStyle} onSelect={(style)=>setAssistantStyle(style)} />
          <div className="mt-6"><VoiceSettings voiceEnabled={voiceEnabled} onToggle={setVoiceEnabled} currentStyle={assistantStyle} onPreview={previewVoice} /></div>
        </>}
      </main>

      {/* Floating chat button */}
      <button onClick={() => setChatOpen(true)} className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center overflow-hidden border-2 border-orange-500 hover:border-orange-400 p-0" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40 }}>
        <img src="/avatar-pilot.png" alt="Eva" className="w-10 h-10 rounded-full object-cover" />
      </button>
      {chatOpen && <AIChatbot onClose={() => setChatOpen(false)} style={assistantStyle} voiceEnabled={voiceEnabled} />}
    </div>
  )
}
