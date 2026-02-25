"use client"

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function RF401ChatFill({dealId}:{dealId:string}){
  const supabase = createClientComponentClient()
  const [messages,setMessages] = React.useState<{id:string,role:string,text:string}[]>([])
  const [input,setInput] = React.useState('')
  const [fields,setFields] = React.useState<any>({})
  const [loading,setLoading] = React.useState(false)

  async function send(){
    if(!input) return
    const msg = {id:Date.now().toString(), role:'user', text: input}
    setMessages(m=>[...m,msg])
    setInput('')
    setLoading(true)
    try{
      const res = await fetch('/api/ai/extract-rf401', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({dealId, text: msg.text})})
      const j = await res.json()
      // expected {fields, preview_html}
      if(j.fields) setFields((f:any)=>({...f,...j.fields}))
      if(j.saved){
        // append system message
        setMessages(m=>[...m,{id:Date.now().toString(), role:'system', text:'Saved RF401 data.'}])
      }
    }catch(e){ console.error(e) }
    setLoading(false)
  }

  return (
    <div className="bg-gray-800 p-4 rounded grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <div className="h-96 overflow-auto bg-gray-900 p-3 rounded">
          {messages.map(m=> <div key={m.id} className={`mb-2 ${m.role==='user'? 'text-white' : 'text-green-300'}`}>{m.role}: {m.text}</div>)}
        </div>
        <div className="mt-2 flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 p-2 bg-gray-900" />
          <button className="dp-btn" onClick={send} disabled={loading}>{loading? '...' : 'Send'}</button>
        </div>
      </div>

      <div className="col-span-1 bg-gray-900 p-3 rounded h-96 overflow-auto">
        <h3 className="font-semibold">RF401 Preview</h3>
        <pre className="text-sm mt-2">{JSON.stringify(fields,null,2)}</pre>
      </div>
    </div>
  )
}
