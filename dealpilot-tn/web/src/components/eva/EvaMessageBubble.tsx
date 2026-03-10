"use client"
import React from 'react'
import EvaRichCardRenderer from './EvaRichCardRenderer'

export default function EvaMessageBubble({role,content,payload}:{role:'user'|'eva',content?:string,payload?:any}){
  if(role==='user'){
    return (
      <div className="self-end text-right">
        <div className="inline-block px-4 py-2 rounded-2xl rounded-br-md bg-orange-500 text-white max-w-[80%]">{content}</div>
      </div>
    )
  }

  // For eva messages: if there's a payload with a type, render the rich card. If content is also present, render both.
  const hasPayload = payload && (payload.type || (payload.data && typeof payload.data === 'object'))
  return (
    <div className="self-start">
      <div className="inline-block px-4 py-2 rounded-2xl rounded-bl-md bg-[#0f1c2e] border border-[#1e3a5f] text-gray-200 max-w-[80%]">
        {content ? <div className="mb-2">{content}</div> : null}
        {hasPayload ? <EvaRichCardRenderer payload={payload} /> : null}
      </div>
    </div>
  )
}
