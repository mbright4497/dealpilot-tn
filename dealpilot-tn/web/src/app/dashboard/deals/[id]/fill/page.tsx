"use client"

import React from 'react'
import RF401ChatFill from '../../../../../components/RF401ChatFill'

export default function FillPage({ params }: { params: { id: string } }){
  return (
    <div className="dp-bg-dark min-h-screen p-6 text-white">
      <h1 className="text-2xl font-bold">RF401 Conversational Fill</h1>
      <p className="text-gray-300">Deal ID: {params.id}</p>
      <div className="mt-6">
        <RF401ChatFill dealId={params.id} />
      </div>
    </div>
  )
}
