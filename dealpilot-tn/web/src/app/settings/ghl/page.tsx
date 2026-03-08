'use client'
import React
import {useRouter} from 'next/navigation' from 'react'
import GhlSettings from '@/components/GhlSettings'

export default function GhlSettingsPage(){
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <a href="/" className="text-sm text-gray-300 hover:text-white">← Back to Dashboard</a>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">GHL Integration Settings</h1>
            <p className="text-sm text-gray-400">Configure GoHighLevel connection for your tenant</p>
          </div>
        </div>
        <GhlSettings />
      </div>
    </div>
  )
}
