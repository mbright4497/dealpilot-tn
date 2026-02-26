'use client'
import React from 'react'
import { PERSONALITY_OPTIONS, type AssistantStyle } from '@/lib/assistant-personality'

type Props = { currentStyle: AssistantStyle; onSelect: (style: AssistantStyle) => void }

export default function PersonalitySelector({ currentStyle, onSelect }: Props){
  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Choose Your Assistant Style</h2>
        <p className="text-sm text-gray-300">This changes how your AI assistant communicates with you.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PERSONALITY_OPTIONS.map(opt=>{
          const selected = opt.value === currentStyle
          return (
            <button key={opt.value} onClick={()=>onSelect(opt.value)} className={`p-4 rounded-lg text-left bg-gray-800 border ${selected? 'border-orange-500 ring-2 ring-orange-500':'border-gray-700'} hover:shadow-lg transition-all w-full`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">{opt.label}</div>
                  <div className="text-sm text-gray-300">{opt.description}</div>
                </div>
                <div className="text-sm text-gray-400 italic">{opt.exampleGreeting}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
