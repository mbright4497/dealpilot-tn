'use client' // deploy trigger
// Stage 5: AssistantPanel with voice and avatar (Issue #10) // voice + avatar integrated
import React, {useState, useEffect} from 'react'
import { applyTone } from '@/lib/tone-engine'
import type { AssistantStyle } from '@/lib/assistant-personality'
import PilotAvatar from './PilotAvatar'
import { speak, stopSpeaking, isSpeaking as checkSpeaking } from '@/lib/voice-engine'
import EvaVideoBubble from './AnimatedAvatar'

const QUICK_PROMPTS = [
    'What deadlines are coming up?',
    'Run a compliance check',
    'Help me fill out an RF401',
    'Summarize this deal',
]

const QUICK_ACTIONS = [
  { id: 'deadlines', label: 'What are my deadlines?', prompt: 'What deadlines are coming up?' },
  { id: 'health', label: 'Deal health summary', prompt: 'Give me a deal health summary for my active deals.' },
  { id: 'attention', label: 'What needs attention?', prompt: 'What needs attention across my active deals?' },
  { id: 'draft', label: 'Help me draft a message', prompt: 'Help me draft a short message to a client about a price reduction.' },
]

const ACTION_CHIPS: { id: string; label: string; prompt: string }[] = [
  { id: 'pull', label: 'Pull File', prompt: "Open a TREC form and pre-fill from the active deal." },
  { id: 'email', label: 'Draft Email', prompt: "Draft a short email to the buyer introducing next steps." },
  { id: 'deadline', label: 'Calculate Deadline', prompt: "Calculate the next important deadline for my active deals" },
  { id: 'contacts', label: 'Show Contacts', prompt: "List contacts for the active deal and their roles." },
  { id: 'risk', label: 'Risk Check', prompt: "Run a quick risk check across active deals and highlight issues." },
]

export default function AIChatbot({onClose, style = 'friendly-tn', voiceEnabled = false, transactionId }:{onClose: ()=>void, style?: AssistantStyle, voiceEnabled?: boolean, transactionId?: number}){
    const [voiceOn, setVoiceOn] = useState<boolean>(voiceEnabled)
    const [messages,setMessages]=useState<any[]>([{role:'system',content:"Hi! I'm Eva, your DealPilot TN assistant \u2013 your personal Tennessee Transaction Coordinator. I can help you fill out TREC forms, calculate contract deadlines, track your transactions, and ensure compliance with Tennessee real estate law. What would you like to work on?"}])
    const [input,setInput]=useState('')
    const [minimized,setMinimized]=useState(false)
    const [speaking,setSpeaking]=useState(false)
    const [formsList,setFormsList]=useState<any[]>([])
    const [showFormModal,setShowFormModal]=useState(false)
    const [selectedFormId,setSelectedFormId]=useState<string|null>(null)
    const [heygenReady, setHeygenReady] = useState(false)

    useEffect(()=>{
      // stop speaking if voice disabled
      if(!voiceOn && checkSpeaking()) stopSpeaking()
    },[voiceOn])

    useEffect(()=>{ fetch('/api/forms').then(r=>r.json()).then(j=>setFormsList(j.forms||[])) },[])

    const [lastSpokenText, setLastSpokenText] = useState<string>('')

    function speakMessage(text:string){
      setLastSpokenText(text)
      if(!voiceOn) return
      if(checkSpeaking()) stopSpeaking()
      // use voice-engine speak() which calls server-side TTS (OpenAI nova voice)
      speak(text, style as AssistantStyle, ()=>setSpeaking(true), ()=>setSpeaking(false))
    }

    function forceSpeak(text:string){
      setLastSpokenText(text)
      if(checkSpeaking()) stopSpeaking()
      speak(text, style as AssistantStyle, ()=>setSpeaking(true), ()=>setSpeaking(false))
    }

    async function send(text?: string){
        const msg = text || input
        if(!msg) return
        setMessages(m=>[...m,{role:'user',content:msg}])
        setInput('')
        try{
          const payload = { messages: [...messages, { role: 'user', content: msg }], style, transactionId }
          const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
          const j = await res.json()
          const reply = j.reply || j.message || 'Sorry, no response.'
          const toned = applyTone(style as AssistantStyle, reply)
          setMessages(m=>[...m,{role:'assistant',content:toned}])
          if(voiceOn){
            // show thinking -> speaking states via EvaVideoBubble and play audio TTS
            setLastSpokenText(reply)
            speak(reply, style as AssistantStyle, ()=>setSpeaking(true), ()=>setSpeaking(false))
          }
        }catch(e:any){
          const raw = `(mock) I can calculate deadlines, fill RF401, or check compliance. What do you need?`
          const toned = applyTone(style as AssistantStyle, raw)
          setMessages(m=>[...m,{role:'assistant',content:toned}])
        }
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
        <div className="fixed top-0 right-0 h-screen flex flex-col bg-white shadow-lg text-gray-900" style={{ width: 420, maxWidth: '100%' }}>
            <div className="p-3 flex justify-between items-center bg-gray-900 text-white">
                <div className="flex items-center gap-3">
                  {voiceOn ? (
                    <div className="flex flex-col items-start" style={{height:200}}>
                      <EvaVideoBubble state={speaking? 'speaking' : 'idle'} size={200} />
                      <div className="mt-2">
                        <div className="text-lg font-bold">Eva</div>
                        <div className="text-xs text-gray-300">{speaking? 'Speaking' : 'Live'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src="/avatar-pilot.png" alt="Eva" className="w-12 h-12 rounded-full object-cover border-2 border-orange-500" />
                      <div className="text-lg font-bold">Eva</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={()=>setMinimized(s=>!s)} className="text-sm px-2 py-1 bg-gray-800 text-gray-200 rounded hover:bg-gray-700">{minimized? 'Restore':'Minimize'}</button>
                    <button onClick={()=>onClose()} className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Close</button>
                    <button onClick={()=>{ if(checkSpeaking()){ stopSpeaking(); setSpeaking(false); } else { setVoiceOn(v=>!v) } }} className={`ml-2 p-1 rounded ${voiceOn? 'text-orange-400':'text-gray-400'}`} title="Toggle voice">
                      {/* speaker icon */}
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19 8a4 4 0 010 8" /></svg>
                    </button>
                </div>
            </div>
            {!minimized && (
            <div className="p-4 flex flex-col flex-1 min-h-0">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {ACTION_CHIPS.map(c=>(
                    <button key={c.id} onClick={()=>{
                      if(c.id === 'pull'){
                        setSelectedFormId(null)
                        setShowFormModal(true)
                      } else onChip(c.id)
                    }} className="bg-gray-700 text-gray-200 rounded-full px-3 py-1.5 text-xs hover:bg-gray-600">{c.label}</button>
                  ))}
                </div>

                <div className="flex gap-2 mb-3 flex-wrap">
                  {QUICK_ACTIONS.map(a=> (
                    <button key={a.id} onClick={()=>send(a.prompt)} className="bg-orange-500 text-white rounded-full px-3 py-1.5 text-xs hover:bg-orange-600">{a.label}</button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 p-2 border rounded bg-gray-50">
                    {messages.map((m,i)=>(
                      <div key={i} className={m.role==='assistant' || m.role==='system'? 'text-left mb-2 flex items-start gap-2':'text-right mb-2'}>
                        { (m.role==='assistant' || m.role==='system') && (
                          <button onClick={()=>{ if(speaking){ stopSpeaking(); setSpeaking(false) } else { forceSpeak(m.content) } }} className="text-gray-400 hover:text-orange-400 p-1">
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19 8a4 4 0 010 8" /></svg>
                          </button>
                        )}
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
