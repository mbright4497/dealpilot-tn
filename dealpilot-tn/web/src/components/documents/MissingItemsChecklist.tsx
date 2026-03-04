"use client"
import React from 'react'

export default function MissingItemsChecklist({ extraction }:{ extraction:any }){
  if(!extraction) return null
  const low = Object.entries(extraction.extraction_json || {}).filter(([k,v]:any)=>!v || (typeof v==='object' && Object.keys(v).length===0))
  if(low.length===0) return null
  return (
    <div className="bg-[#0a1929] p-3 rounded">
      <div className="text-sm font-semibold mb-2">EVA still needs:</div>
      <ul className="text-sm text-gray-300 list-disc ml-5">
        {low.map(([k])=> (<li key={k}>{k}</li>))}
      </ul>
    </div>
  )
}
