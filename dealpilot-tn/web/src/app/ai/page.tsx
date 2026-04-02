'use client'
import React from 'react'
import AIChatbot from '@/components/AIChatbot'

export default function AIPage(){
  return (<div className="p-6"><h1 className="text-2xl font-bold">AI Assistant</h1><div class="mt-2"><a href="/chat" class="text-sm text-gray-400 hover:text-white">← Back to Dashboard</a></div><p className="text-gray-400 mt-2">Full-page Vera assistant. Use the chat below.</p><div className="mt-4"><AIChatbot onClose={()=>{}} /></div></div>)
}
