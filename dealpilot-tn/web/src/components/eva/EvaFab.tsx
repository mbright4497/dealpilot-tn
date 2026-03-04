"use client"
import React from 'react'
import { useEva } from './EvaProvider'

export default function EvaFab(){
  const { toggleEva, isOpen } = useEva()
    if(isOpen) return null
  return (
    <button onClick={toggleEva} aria-label="Open EVA" className="fixed z-50 right-6 bottom-6 bg-orange-500 hover:bg-orange-400 rounded-full w-14 h-14 shadow-xl flex items-center justify-center">
      <img src="/avatar-pilot.png" alt="EVA" className="w-12 h-12 rounded-full object-cover" style={{width:48,height:48}} />
    </button>
  )
}
