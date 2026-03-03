"use client"
import React, { useEffect, useRef } from 'react'
import EvaMessageBubble from './EvaMessageBubble'
import EvaTypingIndicator from './EvaTypingIndicator'

export default function EvaConversation({messages, isTyping}:{messages:any[], isTyping?:boolean}){
  const endRef = useRef<HTMLDivElement|null>(null)
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[messages,isTyping])
  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((m:any)=>(<EvaMessageBubble key={m.id} role={m.role} content={m.content} renderPayload={m.payload}/>))}
      {isTyping && <EvaTypingIndicator />}
      <div ref={endRef} />
    </div>
  )
}
