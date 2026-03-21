'use client'
import React from 'react'

const TEAM = [
  { name: 'Marcus', role: 'COO', status: 'Active' },
  { name: 'Dev', role: 'Software Engineer', status: 'Active' },
  { name: 'Reva', role: 'Transaction Coordinator', status: 'Active' },
  { name: 'Carlos', role: 'Lead Gen & CRM Manager', status: 'Active' },
  { name: 'Nina', role: 'Content & Marketing Director', status: 'Active' },
  { name: 'Maya', role: 'Client Success & Booking', status: 'Active' },
]

function StatusPill({status}:{status:string}){
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if(status==='Active') return <span className={base + ' bg-green-800 text-green-300'}>Active</span>
  if(status==='Idle') return <span className={base + ' bg-yellow-900 text-yellow-300'}>Idle</span>
  return <span className={base + ' bg-red-900 text-red-300'}>Error</span>
}

export default function MissionControl(){
  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Mission Control</h1>
      <p className="text-sm text-gray-300 mb-6">Team org chart — real agent names and roles</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEAM.map(m=>(
          <div key={m.name} className="border border-slate-600 rounded-lg p-4 bg-slate-800">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-bold text-lg">{m.name}</h2>
              <StatusPill status={m.status}/>
            </div>
            <p className="text-sm text-gray-400">{m.role}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
