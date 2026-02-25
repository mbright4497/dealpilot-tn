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
    <div className="min-h-screen flex bg-white">
      <aside className="w-64 bg-gray-900 text-white p-4 hidden md:block">
        <h2 className="text-xl font-bold text-orange-500">DealPilot TN</h2>
        <p className="text-sm text-gray-300">Your Tennessee Transaction Coordinator</p>
        <nav className="mt-6 space-y-2">
          <button onClick={() => { setView('dashboard'); setSelectedTxId(null) }}
            className={`w-full text-left px-3 py-2 rounded transition-colors ${view === 'dashboard' ? 'bg-gray-800 text-orange-400' : 'text-gray-200 hover:text-orange-400'}`}>
            Dashboard
          </button>
          <button onClick={() => { setView('transactions'); setSelectedTxId(null) }}
            className={`w-full text-left px-3 py-2 rounded transition-colors ${view === 'transactions' ? 'bg-gray-800 text-orange-400' : 'text-gray-200 hover:text-orange-400'}`}>
            Active Transactions
          </button>
          <button onClick={() => setView('forms')}
            className={`w-full text-left px-3 py-2 rounded transition-colors ${view === 'forms' ? 'bg-gray-800 text-orange-400' : 'text-gray-200 hover:text-orange-400'}`}>
            Forms Library
          </button>
          <button onClick={() => setView('deadlines')}
            className={`w-full text-left px-3 py-2 rounded transition-colors ${view === 'deadlines' ? 'bg-gray-800 text-orange-400' : 'text-gray-200 hover:text-orange-400'}`}>
            Deadline Calculator
          </button>
          <button onClick={() => setChatOpen(true)}
            className="w-full text-left px-3 py-2 rounded text-gray-200 hover:text-orange-400 transition-colors">
            AI Assistant
          </button>
        </nav>
        {selectedTxId && view === 'deal' && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Deal</p>
            <p className="text-sm text-orange-400 font-semibold">{selectedTx?.address}</p>
            <p className="text-xs text-gray-300">{selectedTx?.client}</p>
          </div>
        )}
      </aside>
      <main className="flex-1 p-6 text-gray-900">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DealPilot TN</h1>
            <p className="text-sm text-gray-600">Tennessee Transaction Coordinator - Tri-Cities Region</p>
          </div>
        </header>
        <section>
          {view === 'dashboard' && (
            <TCDashboard
              transactions={TRANSACTIONS}
              onOpenDeal={openDeal}
              onViewChecklist={openChecklist}
              onNavigate={handleNavigate}
            />
          )}
          {view === 'transactions' && (
            <TransactionList
              transactions={TRANSACTIONS}
              onViewChecklist={openChecklist}
              onOpenDeal={openDeal}
            />
          )}
          {view === 'deal' && selectedTx && (
            <TransactionDetail
              transaction={selectedTx}
              onBack={() => setView('transactions')}
            />
          )}
          {view === 'forms' && <FormsFillView />}
          {view === 'deadlines' && <DeadlineCalculator />}
        </section>
      </main>
      <div className="fixed bottom-6 right-6">
        <button onClick={() => setChatOpen(true)}
          className="bg-orange-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-orange-600 font-bold text-sm transition-colors">
          Chat
        </button>
      </div>
      {chatOpen && <AIChatbot onClose={() => setChatOpen(false)} />}
    </div>
  )
}
