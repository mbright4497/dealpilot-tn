"use client"
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEva } from './EvaProvider'
import EvaConversation from './EvaConversation'
import EvaComposer from './EvaComposer'

export default function EvaDrawer(){
  const { isOpen, closeEva, pageContext, messages } = useEva()
  const [mounted, setMounted] = useState(false)

  useEffect(()=>{
    setMounted(true)
    return ()=>setMounted(false)
  },[])

  if(!mounted) return null

  return createPortal(
    <div className={`fixed top-0 right-0 h-full w-[480px] z-40 transform ${isOpen?'translate-x-0':'translate-x-full'} transition-transform duration-300 ease-in-out`} onClick={(e)=>e.stopPropagation()}>
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
          <EvaConversation messages={messages} />
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-[#11314f]">
          <EvaComposer />
        </div>
      </div>
    </div>, document.body
  )
}
