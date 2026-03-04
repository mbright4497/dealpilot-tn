"use client"
import React, { useState } from 'react'
import { useEva } from './EvaProvider'

export default function EvaComposer(){
  const [text,setText] = useState('')
  const { addMessage, pageContext } = useEva()
  const sendMessage = async (msg:string, ctx:any={})=>{
    const id = String(Date.now())
    addMessage({id,role:'user',content:msg})
    // optimistic add
    try{
      const res = await fetch('/api/eva/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg, context: ctx})})
      const j = await res.json()
      addMessage({id: 'eva_'+Date.now(), role:'eva', content: j.reply || 'EVA placeholder response', payload: j.renderPayload})
    }catch(e){
      addMessage({id:'eva_err_'+Date.now(), role:'eva', content:'EVA is unavailable (placeholder).'})
    }
  }

  const send = async (e?: React.MouseEvent)=>{
    e?.stopPropagation()
    e?.preventDefault()
    if(!text) return
    const ctx = pageContext?.dealId ? { dealId: pageContext.dealId } : {}
    const msg = text
    setText('')
    await sendMessage(msg, ctx)
  }

  const chipSend = async (label:string)=>{
    const ctx = pageContext?.dealId ? { dealId: pageContext.dealId } : {}
    if(label === 'Draft email'){
      // open email draft modal via window event
      window.dispatchEvent(new CustomEvent('eva:openEmailDraft', { detail: { dealId: ctx.dealId, recipientRole: 'buyer', emailType: 'status_update' } }))
      return
    }
    await sendMessage(label, ctx)
  }

  const chips = pageContext?.route && pageContext.route.includes('/dashboard/deals') ? ['Summarize deal','What is missing','Draft email'] : ['Review priorities','Check all deadlines']

  return (
    <div className="border-t border-[#1e3a5f] bg-[#0f1c2e] p-4" onClick={(e)=>e.stopPropagation()}>
      <div className="flex gap-2 mb-2 overflow-x-auto">
        {chips.map(c=> (
          <button key={c} onClick={(ev)=>{ ev.stopPropagation(); ev.preventDefault(); chipSend(c) }} className="bg-[#1e3a5f] text-gray-300 rounded-full px-3 py-1 text-sm hover:bg-orange-500/20">{c}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} className="flex-1 bg-[#0a1628] border border-[#1e3a5f] rounded-xl px-4 py-3 text-white" placeholder="Ask EVA about this page..." />
        <button type="button" onClick={send} className="bg-orange-500 rounded-xl px-4">Send</button>
      </div>
    </div>
  )
}
