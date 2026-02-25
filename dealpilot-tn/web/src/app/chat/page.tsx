'use client'
import React, {useState} from 'react'
import TCDashboard from '@/components/TCDashboard'
import TransactionList from '@/components/TransactionList'
import FormsFillView from '@/components/FormsFillView'
import DeadlineCalculator from '@/components/DeadlineCalculator'
import TCChecklist from '@/components/TCChecklist'
import AIChatbot from '@/components/AIChatbot'

export default function ChatPage(){
  const [view, setView] = useState('dashboard')
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-64 bg-gray-900 text-white p-4 hidden md:block">
        <h2 className="text-xl font-bold text-orange-500">DealPilot TN</h2>
        <p className="text-sm text-gray-300">Your Tennessee Transaction Coordinator</p>
        <nav className="mt-6 space-y-2">
          <button onClick={()=>setView('dashboard')} className="w-full text-left">Dashboard</button>
          <button onClick={()=>setView('transactions')} className="w-full text-left">Active Transactions</button>
          <button onClick={()=>setView('forms')} className="w-full text-left">Forms & Documents</button>
          <button onClick={()=>setView('deadlines')} className="w-full text-left">Deadline Calculator</button>
          <button onClick={()=>setView('checklist')} className="w-full text-left">Checklist</button>
          <button onClick={()=>setChatOpen(true)} className="w-full text-left">AI Assistant</button>
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">DealPilot TN - Your Tennessee Transaction Coordinator</h1>
            <p className="text-sm text-gray-600">TREC forms, TN law, and deadline automation for Tennessee agents</p>
          </div>
        </header>

        <section>
          {view==='dashboard' && <TCDashboard />}
          {view==='transactions' && <TransactionList />}
          {view==='forms' && <FormsFillView />}
          {view==='deadlines' && <DeadlineCalculator />}
          {view==='checklist' && <TCChecklist />}
        </section>
      </main>

      {/* chat bubble */}
      <div className="fixed bottom-6 right-6">
        <button onClick={()=>setChatOpen(true)} className="bg-orange-500 text-white p-4 rounded-full shadow-lg">💬</button>
      </div>

      {chatOpen && <AIChatbot onClose={()=>setChatOpen(false)} />}
    </div>
  )
}
