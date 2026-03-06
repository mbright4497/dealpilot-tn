'use client'
import React, { useState } from 'react'
import CommHub from '@/components/CommHub'
import GhlTab from '@/components/GhlTab'

export default function CommunicationsPage(){
  const sampleDealId = '1'
  const sampleUserId = '1'
  const [activeTab, setActiveTab] = useState<'comms'|'ghl'>('comms')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <a href="/" className="text-sm text-gray-300 hover:text-white">← Back to Dashboard</a>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Communications Hub</h1>
            <p className="text-sm text-gray-400">Manage and compose communications for a deal</p>
          </div>
        </div>

        <div className="mb-6 border-b border-white/10 flex gap-4">
          <button onClick={() => setActiveTab('comms')} className={`pb-3 ${activeTab==='comms' ? 'text-white border-b-2 border-cyan-400' : 'text-gray-400'}`}>Platform Comms</button>
          <button onClick={() => setActiveTab('ghl')} className={`pb-3 ${activeTab==='ghl' ? 'text-white border-b-2 border-cyan-400' : 'text-gray-400'}`}>GHL Channel</button>
        </div>

        {activeTab === 'comms' ? (
          <CommHub dealId={sampleDealId} />
        ) : (
          <GhlTab dealId={sampleDealId} userId={sampleUserId} />
        )}

      </div>
    </div>
  )
}
