'use client'
import React from 'react'
import DealKanban from '@/components/DealKanban'
import StatsCards from '@/components/StatsCards'

export default function DashboardPage(){
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl">DealPilot Dashboard</h1>
        <div className="space-x-2">
          <a className="btn" href="/deals/new">New Deal</a>
          <button className="btn" onClick={()=>fetch('/api/compliance/run',{method:'POST',body:JSON.stringify({deal_id: null})})}>Run Compliance</button>
        </div>
      </header>
      <main className="p-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <DealKanban />
        </div>
        <aside>
          <StatsCards />
        </aside>
      </main>
    </div>
  )
}
