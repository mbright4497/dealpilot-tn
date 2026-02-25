'use client'
import React, {useState} from 'react'
import TCDashboard from '@/components/TCDashboard'
import TransactionList from '@/components/TransactionList'
import FormsFillView from '@/components/FormsFillView'
import DeadlineCalculator from '@/components/DeadlineCalculator'
import TCChecklist from '@/components/TCChecklist'
import AIChatbot from '@/components/AIChatbot'

export const TRANSACTIONS = [
  {id:1, address:'123 Maple St, Johnson City, TN', client:'Alice', type:'Buyer' as const, status:'Active' as const, binding:'2026-02-01', closing:'2026-03-05'},
  {id:2, address:'45 Oak Ln, Kingsport, TN', client:'Bob', type:'Seller' as const, status:'Pending' as const, binding:'2026-02-10', closing:'2026-04-01'},
  {id:3, address:'78 Pine Rd, Bristol, TN', client:'Carol', type:'Buyer' as const, status:'Active' as const, binding:'2026-02-15', closing:'2026-04-20'},
]

export default function ChatPage(){
  const [view, setView] = useState('dashboard')
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<number|null>(null)

  function openChecklist(txId: number){
    setSelectedTxId(txId)
    setView('checklist')
  }

  function goToChecklist(){
    setSelectedTxId(null)
    setView('checklist')
  }

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-64 bg-gray-900 text-white p-4 hidden md:block">
        <h2 className="text-xl font-bold text-orange-500">DealPilot TN</h2>
        <p className="text-sm text-gray-300">Your Tennessee Transaction Coordinator</p>
        <nav className="mt-6 space-y-2">
          <button onClick={()=>setView('dashboard')} className={`w-full text-left px-3 py-2 rounded transition-colors ${view==='dashboard'?'bg-gray-800 text-orange-400':'hover:text-orange-400'}`}>Dashboard</button>
          <button onClick={()=>setView('transactions')} className={`w-full text-left px-3 py-2 rounded transition-colors ${view==='transactions'?'bg-gray-800 text-orange-400':'hover:text-orange-400'}`}>Active Transactions</button>
          <button onClick={()=>setView('forms')} className={`w-full text-left px-3 py-2 rounded transition-colors ${view==='forms'?'bg-gray-800 text-orange-400':'hover:text-orange-400'}`}>Forms & Documents</button>
          <button onClick={()=>setView('deadlines')} className={`w-full text-left px-3 py-2 rounded transition-colors ${view==='deadlines'?'bg-gray-800 text-orange-400':'hover:text-orange-400'}`}>Deadline Calculator</button>
          <button onClick={goToChecklist} className={`w-full text-left px-3 py-2 rounded transition-colors ${view==='checklist'?'bg-gray-800 text-orange-400':'hover:text-orange-400'}`}>Checklists</button>
          <button onClick={()=>setChatOpen(true)} className="w-full text-left px-3 py-2 rounded hover:text-orange-400 transition-colors">AI Assistant</button>
        </nav>
      </aside>
      <main className="flex-1 p-6 text-gray-900">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DealPilot TN - Your Tennessee Transaction Coordinator</h1>
            <p className="text-sm text-gray-500">TREC forms, TN law, and deadline automation for Tennessee agents</p>
          </div>
        </header>
        <section>
          {view==='dashboard' && <TCDashboard onViewChecklist={openChecklist} />}
          {view==='transactions' && <TransactionList transactions={TRANSACTIONS} onViewChecklist={openChecklist} />}
          {view==='forms' && <FormsFillView />}
          {view==='deadlines' && <DeadlineCalculator />}
          {view==='checklist' && <TCChecklist transactions={TRANSACTIONS} selectedTxId={selectedTxId} onSelectTx={setSelectedTxId} onBack={()=>setView('transactions')} />}
        </section>
      </main>
      <div className="fixed bottom-6 right-6">
        <button onClick={()=>setChatOpen(true)} className="bg-orange-500 text-white p-4 rounded-full shadow-lg hover:bg-orange-600">Chat</button>
      </div>
      {chatOpen && <AIChatbot onClose={()=>setChatOpen(false)} />}
    </div>
  )
}
