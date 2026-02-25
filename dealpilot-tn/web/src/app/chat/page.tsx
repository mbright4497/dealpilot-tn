'use client'
import React, { useState } from 'react'
import TCDashboard from '@/components/TCDashboard'
import TransactionList from '@/components/TransactionList'
import FormsFillView from '@/components/FormsFillView'
import DeadlineCalculator from '@/components/DeadlineCalculator'
import AIChatbot from '@/components/AIChatbot'
import TransactionDetail from '@/components/TransactionDetail'

export type Contact = {
  role: string
  name: string
  company: string
  phone: string
  email: string
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
}

export const TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    address: '123 Maple St, Johnson City, TN',
    client: 'Alice Johnson',
    type: 'Buyer',
    status: 'Active',
    binding: '2026-02-01',
    closing: '2026-03-15',
    notes: 'First-time buyer, VA loan. Needs extra guidance on inspection timeline.',
    contacts: [
      { role: 'Title Company', name: 'Sarah Mitchell', company: 'Tri-Cities Title & Escrow', phone: '423-555-0101', email: 'sarah@tricitiestitle.com' },
      { role: 'Lender', name: 'James Park', company: 'HomeTrust Mortgage', phone: '423-555-0102', email: 'jpark@hometrust.com' },
      { role: 'Inspector', name: 'Mike Davis', company: 'Davis Home Inspections', phone: '423-555-0103', email: 'mike@davishomeinspect.com' },
      { role: 'Appraiser', name: 'Linda Chen', company: 'Appalachian Appraisals', phone: '423-555-0104', email: 'lchen@appalachianapp.com' },
      { role: 'Buyer Agent', name: 'Matt Bright', company: 'iHome-KW Kingsport', phone: '423-555-0100', email: 'matt@dealpilottn.com' },
      { role: 'Listing Agent', name: 'Tom Wilson', company: 'RE/MAX Bristol', phone: '423-555-0105', email: 'tom@remax-bristol.com' },
    ]
  },
  {
    id: 2,
    address: '45 Oak Ln, Kingsport, TN',
    client: 'Bob Martinez',
    type: 'Seller',
    status: 'Pending',
    binding: '2026-02-10',
    closing: '2026-04-01',
    notes: 'Seller relocation. Needs quick close. Conventional financing.',
    contacts: [
      { role: 'Title Company', name: 'Karen White', company: 'Mountain Title Group', phone: '423-555-0201', email: 'karen@mountaintitle.com' },
      { role: 'Lender', name: 'David Kim', company: 'First Horizon Bank', phone: '423-555-0202', email: 'dkim@firsthorizon.com' },
      { role: 'Inspector', name: 'Steve Brown', company: 'ProCheck Inspections', phone: '423-555-0203', email: 'steve@procheck.com' },
      { role: 'Listing Agent', name: 'Matt Bright', company: 'iHome-KW Kingsport', phone: '423-555-0100', email: 'matt@dealpilottn.com' },
      { role: 'Buyer Agent', name: 'Lisa Green', company: 'Keller Williams Kingsport', phone: '423-555-0205', email: 'lisa@kw-kingsport.com' },
    ]
  },
  {
    id: 3,
    address: '78 Pine Rd, Bristol, TN',
    client: 'Carol Stevens',
    type: 'Buyer',
    status: 'Active',
    binding: '2026-02-15',
    closing: '2026-04-20',
    notes: 'Investment property. Cash buyer, no lender needed. Thorough inspection required.',
    contacts: [
      { role: 'Title Company', name: 'Sarah Mitchell', company: 'Tri-Cities Title & Escrow', phone: '423-555-0101', email: 'sarah@tricitiestitle.com' },
      { role: 'Inspector', name: 'Mike Davis', company: 'Davis Home Inspections', phone: '423-555-0103', email: 'mike@davishomeinspect.com' },
      { role: 'Buyer Agent', name: 'Matt Bright', company: 'iHome-KW Kingsport', phone: '423-555-0100', email: 'matt@dealpilottn.com' },
      { role: 'Listing Agent', name: 'Jennifer Adams', company: 'Century 21 Bristol', phone: '423-555-0305', email: 'jadams@c21bristol.com' },
    ]
  },
]

function NavIcon({ name }: { name: string }) {
  const p = { width: 18, height: 18, fill: 'none' as const, viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 }
  if (name === 'dashboard') return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  if (name === 'transactions') return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  if (name === 'forms') return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
  if (name === 'deadlines') return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  if (name === 'ai') return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  return null
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'forms', label: 'Forms Library' },
  { id: 'deadlines', label: 'Deadlines' },
]

export default function ChatPage() {
  const [view, setView] = useState('dashboard')
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null)

  function openDeal(txId: number) {
    setSelectedTxId(txId)
    setView('deal')
  }

  function openChecklist(txId: number) {
    setSelectedTxId(txId)
    setView('deal')
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

  const selectedTx = TRANSACTIONS.find(t => t.id === selectedTxId)

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-sm">DP</div>
            <div>
              <h2 className="text-base font-bold text-white">DealPilot TN</h2>
              <p className="text-[11px] text-gray-400">Tri-Cities Transaction Coordinator</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
          <div className="p-4 border-t border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Active Deal</p>
            <p className="text-sm text-orange-400 font-semibold leading-tight">{selectedTx?.address}</p>
            <p className="text-xs text-gray-400 mt-0.5">{selectedTx?.client}</p>
          </div>
        )}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold">MB</div>
            <div>
              <p className="text-sm font-medium text-white">Matt Bright</p>
              <p className="text-[11px] text-gray-400">iHome-KW Kingsport</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <section>
            {view === 'dashboard' && <TCDashboard transactions={TRANSACTIONS} onOpenDeal={openDeal} onViewChecklist={openChecklist} onNavigate={handleNavigate} />}
            {view === 'transactions' && <TransactionList transactions={TRANSACTIONS} onViewChecklist={openChecklist} onOpenDeal={openDeal} />}
            {view === 'deal' && selectedTx && <TransactionDetail transaction={selectedTx} onBack={() => setView('transactions')} />}
            {view === 'forms' && <FormsFillView />}
            {view === 'deadlines' && <DeadlineCalculator />}
          </section>
        </div>
      </main>
      <div className="fixed bottom-6 right-6 z-40">
        <button onClick={() => setChatOpen(true)} className="bg-orange-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all flex items-center justify-center">
          <NavIcon name="ai" />
        </button>
      </div>
      {chatOpen && <AIChatbot onClose={() => setChatOpen(false)} />}
    </div>
  )
}
