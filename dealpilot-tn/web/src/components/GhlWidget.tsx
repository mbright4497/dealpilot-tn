'use client'
import React, { useEffect, useState } from 'react'

function timeAgo(dateStr?: string){
  if(!dateStr) return ''
  const d = new Date(dateStr).getTime()
  const diff = Date.now() - d
  const mins = Math.round(diff/60000)
  if(mins < 1) return 'just now'
  if(mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins/60)
  if(hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs/24)
  return `${days}d ago`
}

export default function GhlWidget(){
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/dashboard/ghl-stats')
        if(!res.ok){
          // fallback to disconnected state
          setStats({ connected: false, messages_sent: 0, messages_limit: 0, recent_count: 0, last_message_at: null, tenant_name: null })
        } else {
          const j = await res.json()
          if(!mounted) return
          setStats(j)
        }
      }catch(e){
        // network or other error - show disconnected state
        setStats({ connected: false, messages_sent: 0, messages_limit: 0, recent_count: 0, last_message_at: null, tenant_name: null })
      }
      setLoading(false)
    })()
    return ()=>{ mounted=false }
  },[])

  const messages_sent = stats?.messages_sent || 0
  const messages_limit = stats?.messages_limit || 0
  const pct = messages_limit ? Math.round((messages_sent / messages_limit) * 100) : 0

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all">
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-white/10 rounded w-32" />
          <div className="h-4 bg-white/6 rounded w-48" />
          <div className="h-3 bg-white/6 rounded w-full mt-2" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-700 to-purple-700 text-white">G</div>
              <div>
                <div className="text-sm font-semibold text-white">GHL Integration</div>
                <div className="text-xs text-gray-400">{stats?.tenant_name || 'No tenant'}</div>
              </div>
            </div>
            <div>
              {stats?.connected ? (
                <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Connected</span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs bg-gray-500/10 text-gray-300 border border-gray-500/20">Not Connected</span>
              )}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-gray-300">Messages</div>
              <div className="text-sm text-gray-300">{messages_sent}/{messages_limit}</div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
            <div>Recent 24h: <span className="text-white ml-1">{stats?.recent_count ?? 0}</span></div>
            <div>{stats?.last_message_at ? timeAgo(stats.last_message_at) : '—'}</div>
          </div>

          <div className="flex gap-4">
            <a href="/communications" className="text-sm text-cyan-300 hover:underline">Open Comms Hub</a>
            <a href="/settings/ghl" className="text-sm text-cyan-300 hover:underline">GHL Settings</a>
          </div>
        </>
      )}
    </div>
  )
}
