'use client'
import React from 'react'
import CommHub from '@/components/CommHub'

export default function CommunicationsPage(){
  const sampleDealId = '1'
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
        <CommHub dealId={sampleDealId} />
      </div>
    </div>
  )
}
