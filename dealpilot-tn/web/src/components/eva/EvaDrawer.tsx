"use client"
import React, { useEffect } from 'react'
import { useEva } from './EvaProvider'

export default function EvaDrawer(){
  const { isOpen, closeEva, pageContext, messages } = useEva()

  return (
    <div className={`fixed top-0 right-0 h-full w-[480px] z-40 transform ${isOpen?'translate-x-0':'translate-x-full'} transition-transform duration-300 ease-in-out`}>
      <div className="h-full bg-[#0a1628] border-l border-[#1e3a5f] flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#11314f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold">E</div>
            <div>
              <div className="text-white font-semibold">EVA</div>
              <div className="text-xs text-gray-400">{pageContext?.route || 'Global'}</div>
            </div>
          </div>
          <div>
            <button onClick={closeEva} className="text-gray-300">Close</button>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col">
            {/* replace with conversation component */}
            {/* lazy require to avoid circular imports */}
            {messages.length===0? <div className="text-gray-400">No messages yet. Ask EVA a question.</div> : (
              <div className="space-y-3">
                {messages.map(m=> (
                  <div key={m.id} className={m.role==='user'? 'self-end text-right':'self-start'}>
                    <div className={`inline-block px-4 py-2 rounded-2xl ${m.role==='user'?'bg-orange-500 text-white':'bg-[#0f1c2e] border border-[#1e3a5f] text-gray-200'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-[#11314f]">
          {/* composer component */}
          <div className="flex gap-2">
            <input placeholder="Ask EVA..." className="flex-1 bg-[#0f3460] p-2 rounded" />
            <button className="bg-orange-500 px-3 py-1 rounded">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
