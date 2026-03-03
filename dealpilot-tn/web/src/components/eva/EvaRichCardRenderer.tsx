"use client"
import React from 'react'

export default function EvaRichCardRenderer({payload}:{payload:any}){
  if(!payload) return null
  const t = payload.type
  if(t==='deal_summary'){
    return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded"><div className="font-semibold">Deal Summary</div><div className="text-sm text-gray-300">{payload.summary}</div></div>)
  }
  if(t==='deadline_risk'){
    return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded"><div className="font-semibold">Deadline Risk</div><div className="text-sm text-gray-300">{payload.note}</div></div>)
  }
  return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] p-3 rounded">Unknown payload</div>)
}
