'use client'
import React, { useState } from 'react'

export default function AIChatbot({ onClose, style, voiceEnabled }: any){
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchDealData(){
    try{
      const txRes = await fetch('/api/transactions')
      const transactions = txRes.ok ? await txRes.json() : []
      const dsRes = await fetch('/api/deal-state')
      const dealState = dsRes.ok ? await dsRes.json() : {}
      const dlRes = await fetch('/api/deadlines')
      const deadlines = dlRes.ok ? await dlRes.json() : {}
      return { transactions, dealState, deadlines }
    }catch(e){
      console.error('Failed to fetch deal data', e)
      return { transactions: [], dealState: {}, deadlines: {} }
    }
  }

  async function handleSubmit(e?: React.FormEvent){
    if (e) e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    const userText = input.trim()
    setMessages(prev=>[...prev, {role:'user', content: userText}])

    const { transactions, dealState, deadlines } = await fetchDealData()
    const systemPrompt = `You are Eva, an AI assistant for a real estate transaction coordinator. You have access to the user's live deal data. Reference deals by address. Give specific deadline dates and party names. Here are the user's active deals: ${JSON.stringify(transactions)}. Here is deal state: ${JSON.stringify(dealState)}. Here are upcoming deadlines: ${JSON.stringify(deadlines)}`

    try{
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userText }] })
      })
      const j = await res.json()
      const reply = j?.reply || j?.choices?.[0]?.message?.content || j?.content || 'No response'
      setMessages(prev=>[...prev, {role:'assistant', content: reply}])
    }catch(err){
      console.error('Chat error', err)
      setMessages(prev=>[...prev, {role:'assistant', content: 'Error: failed to send message.'}])
    }finally{
      setLoading(false)
      setInput('')
    }
  }

  async function quickAction(q: string){
    setLoading(true)
    const { transactions, dealState, deadlines } = await fetchDealData()
    const systemPrompt = `You are Eva, an AI assistant for a real estate transaction coordinator. You have access to the user's live deal data. Reference deals by address. Give specific deadline dates and party names. Here are the user's active deals: ${JSON.stringify(transactions)}. Here is deal state: ${JSON.stringify(dealState)}. Here are upcoming deadlines: ${JSON.stringify(deadlines)}`
    try{
      const res = await fetch('/api/assistant/chat', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: q }] })
      })
      const j = await res.json()
      const reply = j?.reply || j?.choices?.[0]?.message?.content || j?.content || 'No response'
      setMessages(prev=>[...prev, {role:'user', content: q}, {role:'assistant', content: reply}])
    }catch(e){ console.error(e); setMessages(prev=>[...prev, {role:'assistant', content: 'Error fetching quick action'}]) }
    finally{ setLoading(false) }
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-full z-50">
      <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img src="/avatar-pilot.png" alt="Eva" className="w-9 h-9 rounded-full" />
            <div>
              <div className="text-white font-semibold">Eva</div>
              <div className="text-gray-400 text-xs">AI Assistant — connected to live deals</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>quickAction('What are my deadlines?')} className="text-xs px-2 py-1 bg-white/5 rounded">Deadlines</button>
            <button onClick={()=>onClose && onClose()} className="text-xs px-2 py-1 bg-white/5 rounded">Close</button>
          </div>
        </div>
        <div className="h-56 overflow-y-auto bg-black/20 p-2 rounded mb-3">
          {messages.map((m,i)=>(
            <div key={i} className={`mb-2 ${m.role==='assistant'?'text-gray-200':'text-cyan-200'}`}><strong className="text-xs uppercase text-gray-400">{m.role}</strong><div className="mt-1 text-sm">{m.content}</div></div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Eva about a deal..." className="flex-1 bg-white/5 rounded px-3 py-2 text-white" />
          <button type="submit" disabled={loading} className="px-3 py-2 bg-emerald-500 rounded text-white">{loading?'...':'Send'}</button>
        </form>
      </div>
    </div>
  )
}
