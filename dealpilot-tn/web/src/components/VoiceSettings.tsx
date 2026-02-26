'use client'
import React from 'react'
import type { AssistantStyle } from '@/lib/assistant-personality'

export default function VoiceSettings({ voiceEnabled, onToggle, currentStyle, onPreview }:{ voiceEnabled:boolean; onToggle:(b:boolean)=>void; currentStyle:AssistantStyle; onPreview:(s:AssistantStyle)=>void }){
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-white max-w-md">
      <h3 className="text-lg font-semibold">Voice Settings</h3>
      <p className="text-sm text-gray-300">Manage voice preferences for your assistant.</p>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Enable Voice Mode</div>
          <div className="text-xs text-gray-400">Voice will only play when you click the speaker icon.</div>
        </div>
        <div>
          <button onClick={()=>onToggle(!voiceEnabled)} className={`w-12 h-6 rounded-full p-0.5 ${voiceEnabled? 'bg-orange-500':'bg-gray-600'}`} aria-pressed={voiceEnabled}>
            <div className={`bg-white w-5 h-5 rounded-full transform ${voiceEnabled? 'translate-x-6':'translate-x-0'} transition-transform`}></div>
          </button>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <div className="text-xs text-gray-400">Current style</div>
        <div className="text-white font-medium">{currentStyle}</div>
      </div>

      <div className="mt-4">
        <button onClick={()=>onPreview(currentStyle)} disabled={!voiceEnabled || !supported} className={`px-3 py-2 rounded ${voiceEnabled && supported? 'bg-orange-500 text-white':'bg-gray-700 text-gray-400'}`}>Preview Voice</button>
      </div>

      {!supported && (
        <div className="mt-3 text-xs text-yellow-300">Your browser does not support Speech Synthesis API. Voice preview is unavailable.</div>
      )}

      <div className="mt-3 text-xs text-gray-400">Voice will never auto-play. It only plays when you click the speaker icon.</div>
    </div>
  )
}
