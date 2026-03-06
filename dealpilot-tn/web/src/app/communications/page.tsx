'use client'
import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function CommunicationsPage(){
  const supabase = createClientComponentClient()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  async function load(){
    setLoading(true)
    try{
      const url = filter==='all' ? '/api/notifications' : `/api/notifications?type=${encodeURIComponent(filter)}`
      const res = await fetch(url)
      if(!res.ok) throw new Error('Failed')
      const j = await res.json()
      setNotifications(j.notifications || [])
    }catch(e){ console.error(e) }
    setLoading(false)
  }

  useEffect(()=>{ load() },[filter])

  async function markRead(id:string){
    try{
      const res = await fetch('/api/notifications', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, read: true }) })
      if(res.ok) load()
    }catch(e){ console.error(e) }
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <a href="/" className="text-sm text-gray-300 hover:text-white">← Back</a>
            <h1 className="text-3xl font-bold text-white">Communications & Notifications</h1>
            <p className="text-sm text-gray-400">Unified inbox for deal and system notifications</p>
          </div>
          <div>
            <select value={filter} onChange={e=>setFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded p-2 text-white">
              <option value="all">All</option>
              <option value="deadline_warning">Deadlines</option>
              <option value="document_uploaded">Documents</option>
              <option value="checklist_completed">Checklist</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4">
          {loading && <div className="text-sm text-gray-400">Loading…</div>}
          {!loading && notifications.length===0 && <div className="text-sm text-gray-400">No notifications</div>}
          <div className="space-y-3">
            {notifications.map((n:any)=> (
              <div key={n.id} className={`p-3 rounded ${n.read? 'bg-gray-800':'bg-gray-700'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">{n.title || n.type}</div>
                    <div className="text-sm text-gray-300">{n.message}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
                    {!n.read && <button onClick={()=>markRead(n.id)} className="text-xs text-cyan-300 mt-2">Mark read</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
