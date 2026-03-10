"use client"
import React from 'react'
import EvaRichCardRenderer from './EvaRichCardRenderer'

function escapeHtml(unsafe:string){ return unsafe.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

function renderMarkdown(text:string){
  if(!text) return ''
  // escape first
  let t = escapeHtml(text)
  // bold **text**
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // ordered lists: lines starting with 1. 2. etc -> wrap in <ol>
  const lines = t.split(/\r?\n/)
  const out: string[] = []
  let inUl = false
  let inOl = false
  for(const line of lines){
    const trimmed = line.trim()
    if(/^\-\s+/.test(trimmed)){
      if(inOl){ out.push('</ol>'); inOl=false }
      if(!inUl){ out.push('<ul>'); inUl=true }
      out.push('<li>'+trimmed.replace(/^\-\s+/, '')+'</li>')
    } else if(/^\d+\.\s+/.test(trimmed)){
      if(inUl){ out.push('</ul>'); inUl=false }
      if(!inOl){ out.push('<ol>'); inOl=true }
      out.push('<li>'+trimmed.replace(/^\d+\.\s+/, '')+'</li>')
    } else {
      if(inUl){ out.push('</ul>'); inUl=false }
      if(inOl){ out.push('</ol>'); inOl=false }
      out.push(trimmed.replace(/\n/g,'<br/>'))
    }
  }
  if(inUl) out.push('</ul>')
  if(inOl) out.push('</ol>')
  return out.join('\n')
}

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
        {content ? <div className="mb-2" dangerouslySetInnerHTML={{__html: renderMarkdown(content)}} /> : null}
        {hasPayload ? <EvaRichCardRenderer payload={payload} /> : null}
      </div>
    </div>
  )
}
