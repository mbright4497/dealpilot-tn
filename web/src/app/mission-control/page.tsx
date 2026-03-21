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
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Mission Control</h1>
        <p className="text-gray-400 text-sm mt-1">Team org chart and live statuses</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEAM.map(member => (
          <div key={member.name} className="bg-dp-card p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold">{member.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">{member.name}</h3>
                  <StatusPill status={member.status} />
                </div>
                <p className="text-gray-400 text-sm mt-1">{member.role}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
