'use client'
// Stage 4: AssistantPanel with action chips (Issue #10)
import React, {useState} from 'react'
import { applyTone } from '@/lib/tone-engine'
import type { AssistantStyle } from '@/lib/assistant-personality'

const QUICK_PROMPTS = [
    'What deadlines are coming up?',
    'Run a compliance check',
    'Help me fill out an RF401',
    'Summarize this deal',
]

const ACTION_CHIPS: { id: string; label: string; prompt: string }[] = [
  { id: 'pull', label: 'Pull File', prompt: "Pull up the file for the active deal and summarize key fields." },
  { id: 'email', label: 'Draft Email', prompt: "Draft a short email to the buyer introducing next steps." },
  { id: 'deadline', label: 'Calculate Deadline', prompt: "Calculate the next important deadline for my active deals" },
  { id: 'contacts', label: 'Show Contacts', prompt: "List contacts for the active deal and their roles." },
  { id: 'risk', label: 'Risk Check', prompt: "Run a quick risk check across active deals and highlight issues." },
]

export default function AIChatbot({onClose, style = 'friendly-tn'}: {onClose: ()=>void, style?: AssistantStyle}){
    const [messages,setMessages]=useState<any[]>([{role:'system',content:"Hi! I'm your DealPilot TN assistant \u2013 your personal Tennessee Transaction Coordinator. I can help you fill out TREC forms, calculate contract deadlines, track your transactions, and ensure compliance with Tennessee real estate law. What would you like to work on?"}])
    const [input,setInput]=useState('')
    const [minimized,setMinimized]=useState(false)

    function send(text?: string){
        const msg = text || input
        if(!msg) return
        setMessages(m=>[...m,{role:'user',content:msg}])
        setInput('')
        setTimeout(()=>{
            const raw = `(mock) I can calculate deadlines, fill RF401, or check compliance. What do you need?`
            const toned = applyTone(style as AssistantStyle, raw)
            setMessages(m=>[...m,{role:'assistant',content:toned}])
        },500)
    }

    function newChat(){
        setMessages([{role:'system',content:"Hi! I'm your DealPilot TN assistant \u2013 your personal Tennessee Transaction Coordinator. I can help you fill out TREC forms, calculate contract deadlines, track your transactions, and ensure compliance with Tennessee real estate law. What would you like to work on?"}])
        setInput('')
    }

    function onChip(id:string){
      const chip = ACTION_CHIPS.find(c=>c.id===id)
      if(!chip) return
      send(chip.prompt)
    }

    return (
        <div className="fixed top-0 right-0 h-full bg-white shadow-lg text-gray-900" style={{ width: 420, maxWidth: '100%' }}>
            <div className="p-3 flex justify-between items-center bg-gray-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold">Your AI Assistant</div>
                </div>
                <div className="flex gap-2">
                    <button onClick={()=>setMinimized(s=>!s)} className="text-sm px-2 py-1 bg-gray-800 text-gray-200 rounded hover:bg-gray-700">{minimized? 'Restore':'Minimize'}</button>
                    <button onClick={()=>onClose()} className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Close</button>
                </div>
            </div>
            {!minimized && (
            <div className="p-4 flex flex-col h-full">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {ACTION_CHIPS.map(c=>(
                    <button key={c.id} onClick={()=>onChip(c.id)} className="bg-gray-700 text-gray-200 rounded-full px-3 py-1.5 text-xs hover:bg-gray-600">{c.label}</button>
                  ))}
                </div>

                <div className="flex-1 overflow-auto p-2 border rounded bg-gray-50">
                    {messages.map((m,i)=>(
                      <div key={i} className={m.role==='assistant' || m.role==='system'? 'text-left mb-2':'text-right mb-2'}>
                        <div className={m.role==='assistant' || m.role==='system'? 'inline-block bg-blue-50 text-gray-800 p-2 rounded-lg max-w-xs':'inline-block bg-orange-50 text-gray-800 p-2 rounded-lg max-w-xs'}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-3">
                  <div className="p-2 bg-white border rounded flex gap-2">
                    <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} className="border-none p-2 flex-1 rounded text-gray-900 placeholder-gray-400" placeholder="Type a message..." />
                    <button onClick={()=>send()} className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Send</button>
                  </div>
                </div>
            </div>
            )}
        </div>
    )
}
