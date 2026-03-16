'use client'
import React from 'react'
import Link from 'next/link'

export default function DealPickerModal({ open, deals = [], onClose, onSelect }:{open:boolean,deals?:any[],onClose:()=>void,onSelect:(d:any)=>void}){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-[#071224] p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-semibold">Select a Deal</div>
          <button onClick={onClose} className="text-sm text-gray-400">Close</button>
        </div>
        <div className="space-y-2 max-h-80 overflow-auto">
          {(!deals || deals.length===0) && <div className="text-gray-400">No active deals</div>}
          {deals.map((d:any)=> (
            <div key={d.id} className="p-2 rounded hover:bg-gray-800 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{d.address}</div>
                <div className="text-xs text-gray-400">{d.client} • {d.status}</div>
              </div>
              <div>
                <button onClick={()=>{ onSelect(d); onClose() }} className="px-3 py-1 bg-emerald-500 text-black rounded">Select</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
