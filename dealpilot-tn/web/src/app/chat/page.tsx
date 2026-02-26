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
  if (name === 'dashboard') return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (name === 'transactions') return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  if (name === 'forms') return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  if (name === 'deadlines') return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  if (name === 'ai') return <svg {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
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
  const [selectedTxId, setSelectedTxId] = useState<number|null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS)

  function addTransaction(tx: any) {
    const newTx: Transaction = {
      id: tx.id || Date.now(),
      address: tx.address || '',
      client: tx.client || '',
      type: tx.type || 'Buyer',
      status: tx.status || 'Active',
      binding: tx.binding || '',
      closing: tx.closing || '',
      contacts: tx.contacts || [],
      notes: tx.notes || '',
    }
    setTransactions(prev => [...prev, newTx])
  }

  function openDeal(txId: number) {
    setSelectedTxId(txId)
    setView('deal')
  }

  function openChecklist(txId: number) {
    setSelectedTxId(txId)
    setView('deal')
  }

  function updateTransactionContacts(txId: number, contacts: any[]) { setTransactions(prev => prev.map(t => t.id === txId ? {...t, contacts} : t)) }

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
        {view === 'dashboard' && <TCDashboard transactions={transactions} onNavigate={handleNavigate} onOpenDeal={openDeal} />}
        {view === 'transactions' && <TransactionList transactions={transactions} onViewChecklist={openChecklist} onOpenDeal={openDeal} onAddTransaction={addTransaction} />}
        {view === 'deal' && selectedTx && <TransactionDetail transaction={selectedTx} onBack={() => setView('transactions')} onUpdateContacts={updateTransactionContacts} />}
        {view === 'forms' && <FormsFillView />}
        {view === 'deadlines' && <DeadlineCalculator />}
      </main>

      {/* Floating chat button */}
      <button onClick={() => setChatOpen(true)} className="bg-orange-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all flex items-center justify-center" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40 }}>
        <svg width={24} height={24} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </button>

      {chatOpen && <AIChatbot onClose={() => setChatOpen(false)} />}
    </div>
  )
}
