'use client'
import React, { useState, useEffect } from 'react'
import { applyTone } from '@/lib/tone-engine'
import type { AssistantStyle } from '@/lib/assistant-personality'
import { speak, stopSpeaking, isSpeaking as checkSpeaking } from '@/lib/voice-engine'

export default function AIChatbot({ onClose, style = 'friendly-tn', voiceEnabled = false, transactionId }: { onClose: () => void, style?: AssistantStyle, voiceEnabled?: boolean, transactionId?: number }){
  const [voiceOn, setVoiceOn] = useState<boolean>(voiceEnabled)
  const [messages, setMessages] = useState<any[]>([{ role: 'system', content: "Hi! I'm Reva, your DealPilot TN assistant — your Real Estate Virtual Assistant. I can help you fill out TREC forms, calculate contract deadlines, track your transactions, and ensure compliance with Tennessee real estate law. What would you like to work on?" }])
  const [input, setInput] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [speaking, setSpeaking] = useState(false)

    const [recording, setRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  let recog: any = null
  useEffect(()=>{
    const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if(R) setSpeechSupported(true)
  },[])

  function startRecognition(){
    const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if(!R) return
    recog = new R()
    recog.lang = 'en-US'
    recog.interimResults = false
    recog.maxAlternatives = 1
    recog.onstart = ()=> setRecording(true)
    recog.onend = ()=> setRecording(false)
    let timeout: any = null
    recog.onresult = (ev:any)=>{
      const t = ev.results[ev.results.length-1][0].transcript
      setInput(prev => (prev? prev + ' ' : '') + t)
      // auto-send after small pause
      if(timeout) clearTimeout(timeout)
      timeout = setTimeout(()=>{ send((input? input + ' ' : '') + t) }, 2000)
    }
    recog.onerror = (e:any)=>{ console.error('speech error', e); setRecording(false) }
    recog.start()
  }

  useEffect(()=>{ if(!voiceOn && checkSpeaking()) stopSpeaking() },[voiceOn])

  useEffect(()=>{ try{ const raw = localStorage.getItem('reva_conversation'); if(raw) setMessages(JSON.parse(raw)) }catch(e){} },[])
  useEffect(()=>{ try{ localStorage.setItem('reva_conversation', JSON.stringify(messages)) }catch(e){} },[messages])

  function playTTS(text:string){ if(!voiceOn) return; if(checkSpeaking()) stopSpeaking(); speak(text as any, style as AssistantStyle, ()=>setSpeaking(true), ()=>setSpeaking(false)) }

  async function createTransactionFromExtracted(ef:any){
    try{
      const payload = {
        address: ef.address || ef.propertyAddress || ef.property_address || ef.property || '',
        client_name: ef.client_name || ef.client || (ef.buyer_names && Array.isArray(ef.buyer_names) ? ef.buyer_names.join(', ') : ef.buyer_names) || '',
        purchase_price: ef.purchase_price || ef.price || null,
        closing_date: ef.closing_date || ef.closing || null,
        deal_type: ef.deal_type || ef.type || 'buyer'
      }
      const res = await fetch('/api/transactions/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if(!res.ok) { const msg = j.error || res.statusText || 'Failed'; setMessages(m=>[...m, { role: 'assistant', content: `Failed to create transaction: ${msg}` }]); return }
      const url = j.url || (`/deal/${j.id}`)
      setMessages(m=>[...m, { role: 'assistant', content: `Transaction created: ${url}` }])
    }catch(e:any){ console.error(e); setMessages(m=>[...m, { role:'assistant', content: 'Error creating transaction.' }]) }
  }

  // helper: if AI indicates intent to create a transaction, call creation path automatically
  async function maybeAutoCreate(j:any){
    try{
      // Recognize explicit intent flags from the AI backend
      if(j.intent === 'create_transaction' || j.createTransaction === true){
        const ef = j.extractedFields || j.extracted || {}
        if(ef && Object.keys(ef).length > 0){
          await createTransactionFromExtracted(ef)
          return true
        }
      }
      // fallback: if extractedFields exist and user has not confirmed after a short delay, offer create prompt (handled in UI already)
      return false
    }catch(e){ return false }
  }

  async function send(text?:string){
    const msg = text || input
    if(!msg) return
    setMessages(m=>[...m, { role: 'user', content: msg }])
    setInput('')
    try{
      const payload = { messages: [...messages, { role: 'user', content: msg }], style, transactionId }
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      const reply = j.reply || j.message || 'Sorry, no response.'
      const toned = applyTone(style as AssistantStyle, reply)

      // if AI explicitly signals creation intent, try auto-create first
      const auto = await maybeAutoCreate(j)
      if(auto) {
        // AI already created a transaction or we triggered creation—append a confirmation message
        setMessages(m=>[...m, { role: 'assistant', content: toned }])
        playTTS(reply)
        return
      }

      // if extractedFields returned, attach extracted + summary
      if(j.extractedFields && Object.keys(j.extractedFields).length > 0){
        const ef = j.extractedFields
        const summary = `Address: ${ef.address || ef.propertyAddress || ef.property_address || '—'}\nClient: ${ef.client_name || ef.client || (ef.buyer_names ? (Array.isArray(ef.buyer_names)? ef.buyer_names.join(', '): ef.buyer_names) : '—')}\nPrice: ${ef.purchase_price || ef.price || '—'}\nClosing: ${ef.closing_date || ef.closing || '—'}`
        setMessages(m=>[...m, { role: 'assistant', content: toned, extracted: ef, summary }])
        // optionally speak
        playTTS(reply)
        return
      }

      setMessages(m=>[...m, { role: 'assistant', content: toned }])
      playTTS(reply)
    }catch(e:any){ console.error(e); setMessages(m=>[...m,{ role:'assistant', content:'Error contacting AI.' }]) }
  }

  return (
    <div className="fixed top-0 right-0 h-screen flex flex-col bg-white shadow-lg text-gray-900" style={{ width: 420, maxWidth: '100%' }}>
      <div className="p-3 flex justify-between items-center bg-gray-900 text-white">
        <div className="flex items-center gap-3">
          <img src="/avatar-pilot.png" alt="Reva" className="w-12 h-12 rounded-full object-cover border-2 border-orange-500" />
          <div>
            <div className="text-lg font-bold">Reva</div>
            <div className="text-xs text-gray-300">{speaking? 'Speaking' : 'Live'}</div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={()=>setMinimized(s=>!s)} className="text-sm px-2 py-1 bg-gray-800 text-gray-200 rounded hover:bg-gray-700">{minimized? 'Restore':'Minimize'}</button>
          <button onClick={()=>onClose()} className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Close</button>
          <button onClick={()=>setVoiceOn(v=>!v)} className={`ml-2 p-1 rounded ${voiceOn? 'text-orange-400':'text-gray-400'}`} title="Toggle voice">🔊</button>
        </div>
      </div>

      {!minimized && (
        <div className="p-4 flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 p-2 border rounded bg-gray-50">
            {messages.map((m,i)=> (
              <div key={i} className={m.role==='assistant' || m.role==='system'? 'text-left mb-2' : 'text-right mb-2'}>
                <div className={m.role==='assistant' || m.role==='system'? 'inline-block bg-blue-50 text-gray-800 p-2 rounded-lg max-w-xs' : 'inline-block bg-orange-50 text-gray-800 p-2 rounded-lg max-w-xs'}>
                  {m.content}
                </div>
                {m.extracted && (
                  <div className="mt-2 p-3 bg-white border rounded shadow-sm max-w-md text-sm">
                    <div className="font-semibold mb-2">I found these details — create a transaction?</div>
                    <pre className="text-xs bg-gray-100 p-2 rounded mb-2 whitespace-pre-wrap">{m.summary || JSON.stringify(m.extracted, null, 2)}</pre>
                    <div className="flex gap-2">
                      <button onClick={()=>createTransactionFromExtracted(m.extracted)} className="px-3 py-1 bg-emerald-500 text-white rounded">Confirm &amp; Create</button>
                      <button onClick={()=>{ setMessages(prev => prev.map(x => x === m ? { ...x, extracted: false } : x)) }} className="px-3 py-1 bg-gray-200 rounded">Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="p-2 bg-white border rounded flex gap-2 items-center">
              {speechSupported && (
                <button onClick={()=>{ if(recording){ /* stop by reloading page or rely on recognition end */ } else startRecognition() }} title={recording? 'Recording...' : 'Record voice input'} className={`p-2 rounded ${recording? 'bg-red-500 text-white' : 'bg-gray-100'}`}>
                  {recording? '●' : '🎤'}
                </button>
              )}
              <input id="reva-file-input" type="file" accept="application/pdf,image/*" className="hidden" onChange={async (e)=>{ const f = e.target.files&&e.target.files[0]; if(!f) return; const fd = new FormData(); fd.append('file', f); try{ const r = await fetch('/api/intake-apply', { method:'POST', body: fd }); if(r.ok) alert('Uploaded'); else alert('Upload failed') }catch(e){ alert('Upload failed') } }} />
              <button onClick={()=>{ const inp = document.getElementById('reva-file-input') as HTMLInputElement; if(inp) inp.click() }} className="p-2 rounded bg-gray-100">📎</button>
              <textarea value={input} onChange={e=>setInput(e.target.value)} rows={2} className="border-none p-2 flex-1 rounded text-gray-900 placeholder-gray-400" placeholder="Type a message..." />
              <button onClick={()=>send()} className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
