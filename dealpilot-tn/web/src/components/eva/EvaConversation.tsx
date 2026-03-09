"use client"
import React, { useEffect, useRef } from 'react'
import EvaMessageBubble from './EvaMessageBubble'
import EvaTypingIndicator from './EvaTypingIndicator'
import { useEva } from './EvaProvider'

export default function EvaConversation({messages, isTyping}:{messages?:any[], isTyping?:boolean}){
  const ctx = useEva()
  const msgs = Array.isArray(messages) ? messages : (ctx?.messages || [])
  const endRef = useRef<HTMLDivElement|null>(null)
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs,isTyping])
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.isArray(msgs) && msgs.map((m:any)=>(<EvaMessageBubble key={m.id} role={m.role} content={m.content} renderPayload={m.payload}/>))}
      {isTyping && <EvaTypingIndicator />}
      <div ref={endRef} />
    </div>
  )
}
