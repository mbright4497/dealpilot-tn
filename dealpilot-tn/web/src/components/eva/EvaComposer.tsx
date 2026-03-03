"use client"
import React, { useState } from 'react'
import { useEva } from './EvaProvider'

export default function EvaComposer(){
  const [text,setText] = useState('')
  const { addMessage } = useEva()
  const send = async (e?: React.MouseEvent)=>{
    e?.stopPropagation()
    e?.preventDefault()
    if(!text) return
    const id = String(Date.now())
    addMessage({id,role:'user',content:text})
    setText('')
    // call API for reply - simple fire
    try{
      const res = await fetch('/api/eva/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text, context: {}})})
      const j = await res.json()
      addMessage({id: 'eva_'+Date.now(), role:'eva', content: j.reply || 'EVA placeholder response', payload: j.renderPayload})
    }catch(e){
      addMessage({id:'eva_err_'+Date.now(), role:'eva', content:'EVA is unavailable (placeholder).'})
    }
  }
  return (
    <div className="border-t border-[#1e3a5f] bg-[#0f1c2e] p-4" onClick={(e)=>e.stopPropagation()}>
      <div className="flex gap-2 mb-2 overflow-x-auto">
        {/* chips placeholder */}
        <div className="bg-[#1e3a5f] text-gray-300 rounded-full px-3 py-1 text-sm">Summarize deal</div>
        <div className="bg-[#1e3a5f] text-gray-300 rounded-full px-3 py-1 text-sm">Check deadlines</div>
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} className="flex-1 bg-[#0a1628] border border-[#1e3a5f] rounded-xl px-4 py-3 text-white" placeholder="Ask EVA about this page..." />
        <button type="button" onClick={send} className="bg-orange-500 rounded-xl px-4">Send</button>
      </div>
    </div>
  )
}
