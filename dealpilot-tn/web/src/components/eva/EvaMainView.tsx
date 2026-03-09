'use client'
'use client'
import React, {useEffect} from 'react'
import EvaConversation from './EvaConversation'
import EvaComposer from './EvaComposer'
import EvaRichCardRenderer from './EvaRichCardRenderer'
import { useEva } from './EvaProvider'
import './eva-styles.css'

export default function EvaMainView({ transactions = [], onViewDeal }:{ transactions?: any[], onViewDeal?: (id:number)=>void }){
  const { addMessage } = useEva()

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/eva/briefing')
        if(!res.ok) return
        const j = await res.json()
        if(!mounted) return
        if(j?.message){ addMessage({ id: 'briefing-1', role: 'eva', content: j.message }) }
        // add transaction cards
        if(Array.isArray(transactions)){
          transactions.forEach((tx:any)=>{
            addMessage({ id: `deal-${tx.id}`, role: 'eva', content: '', payload: { type: 'transaction_card', data: tx } })
          })
        }
        // final prompt
        addMessage({ id: 'briefing-2', role: 'eva', content: "What would you like to work on?", payload: { type: 'chips', chips: ['Check deadlines','Upload a document','Draft an email','Start new transaction'] } })
      }catch(e){ console.error('eva briefing failed', e) }
    })()
    return ()=>{ mounted=false }
  },[transactions, addMessage])

  return (
    <div className="eva-main bg-[#0a1628] min-h-screen flex">
      {/* Left strip */}
      <aside className="w-16 bg-[#071022] flex flex-col items-center py-4">
        <div className="mb-6 text-white font-bold">CP</div>
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-full bg-gray-700" />
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col">
        {/* Eva header */}
        <header className="flex items-center gap-4 p-4 bg-[#0f1d32] border-b border-white/6">
          <img src="/avatar-pilot.png" alt="Eva" className="w-20 h-20 rounded-full" />
          <div>
            <div className="text-white font-bold text-lg">Eva</div>
            <div className="text-gray-300 text-sm">Your Transaction Coordinator <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full" /></div>
          </div>
        </header>

        {/* Conversation area */}
        <div className="flex-1 overflow-auto p-4">
          <EvaConversation />
        </div>

        {/* Composer area */}
        <div className="p-4 bg-[#071022] border-t border-white/6">
          <div className="mb-2 flex gap-2">
            <button onClick={()=>{ addMessage({ id: 'pill-mydeals', role: 'user', content: 'My Deals' }) }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">My Deals</button>
            <button onClick={()=>{ addMessage({ id: 'pill-addtx', role: 'user', content: 'Add Transaction' }) }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">Add Transaction</button>
            <button onClick={()=>{ addMessage({ id: 'pill-deadlines', role: 'user', content: 'Deadlines' }) }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">Deadlines</button>
            <button onClick={()=>{ addMessage({ id: 'pill-upload', role: 'user', content: 'Upload Document' }) }} className="px-3 py-1 rounded border border-cyan-500 text-cyan-400">Upload Document</button>
          </div>
          <EvaComposer />
        </div>
      </main>
    </div>
  )
}
