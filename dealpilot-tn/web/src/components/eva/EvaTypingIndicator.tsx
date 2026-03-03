"use client"
import React from 'react'

export default function EvaTypingIndicator(){
  return (
    <div className="inline-flex gap-1 bg-[#0f1c2e] border border-[#1e3a5f] rounded-2xl px-4 py-3">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0s'}} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.15s'}} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.3s'}} />
    </div>
  )
}
