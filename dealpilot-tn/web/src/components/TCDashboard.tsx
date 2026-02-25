'use client'
import React from 'react'

interface Props {
  onViewChecklist?: (txId: number) => void
}

export default function TCDashboard({ onViewChecklist }: Props){
  const stats = { activeDeals:3, upcomingDeadlines:5, pendingTasks:8, completed:12 }
  const activities = [
    'Earnest money received for 123 Maple St',
    'Inspection completed for 45 Oak Ln',
    'Appraisal ordered for 78 Pine Rd',
    'Title commitment received for 123 Maple St',
    'Final walkthrough scheduled for 45 Oak Ln',
  ]

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Active Deals</div>
          <div className="text-2xl font-bold">{stats.activeDeals}</div>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Upcoming Deadlines</div>
          <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Pending Tasks</div>
          <div className="text-2xl font-bold">{stats.pendingTasks}</div>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <div className="text-sm text-gray-500">Completed This Month</div>
          <div className="text-2xl font-bold">{stats.completed}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 shadow rounded">
          <h3 className="font-bold mb-2">Recent Activity</h3>
          <ul className="text-sm text-gray-700">
            {activities.map((a,i)=>(<li key={i} className="py-2 border-b">{a} <div className="text-xs text-gray-400">{new Date().toLocaleString()}</div></li>))}
          </ul>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h3 className="font-bold mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full p-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">Start New Transaction</button>
            <button className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Calculate Deadlines</button>
            <button className="w-full p-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors">Fill RF401 Form</button>
            <button onClick={()=>onViewChecklist && onViewChecklist(1)} className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">View Checklist</button>
          </div>
        </div>
      </div>
    </div>
  )
}
