"use client"
import React from 'react'
import { useEva } from './EvaProvider'

export default function EvaFab(){
  const { toggleEva } = useEva()
  return (
    <button onClick={toggleEva} aria-label="Open EVA" className="fixed z-50 right-6 bottom-6 bg-orange-500 hover:bg-orange-400 rounded-full w-14 h-14 shadow-xl flex items-center justify-center animate-pulse">
      <span style={{fontSize:20,color:'white'}}>★</span>
    </button>
  )
}
