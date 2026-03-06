'use client'
import React, { useEffect, useState } from 'react'
import CommHub from '@/components/CommHub'
import GhlTab from '@/components/GhlTab'

export default function CommunicationsPage(){
  const [activeTab, setActiveTab] = useState<'comms'|'ghl'>('comms')
  const [dealId, setDealId] = useState<string | null>(null)
  const [deals, setDeals] = useState<any[]>([])
  const [loadingDeals, setLoadingDeals] = useState(false)

  // support ?deal_id=xxx
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const q = params.get('deal_id')
    if(q) setDealId(q)
  },[])

  useEffect(()=>{
    let mounted = true
    setLoadingDeals(true)
    fetch('/api/deal-state/all').then(r=>r.json()).then(j=>{
      if(!mounted) return
      const list = Array.isArray(j) ? j : (j.results || j.deals || [])
      setDeals(list)
      // if no deal selected, pick first
      if(!dealId && list && list.length>0){ setDealId(list[0].id || list[0].deal_id || String(list[0].id)) }
    }).catch(()=>{}).finally(()=>{ if(mounted) setLoadingDeals(false) })
    return ()=>{ mounted=false }
  },[])

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

        <div className="mb-4">
          {loadingDeals ? (
            <div className="text-sm text-gray-400">Loading deals…</div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300">Select Deal</label>
              <select value={dealId ?? ''} onChange={e=>setDealId(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-gray-200">
                <option value="">-- Select a deal --</option>
                {deals.map(d=> (
                  <option key={d.deal_id || d.id} value={d.deal_id || d.id}>{(d.address || d.property_address || 'Unknown')} {d.client ? `— ${d.client}` : ''}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mb-6 border-b border-white/10 flex gap-4">
          <button onClick={() => setActiveTab('comms')} className={`pb-3 ${activeTab==='comms' ? 'text-white border-b-2 border-cyan-400' : 'text-gray-400'}`}>Platform Comms</button>
          <button onClick={() => setActiveTab('ghl')} className={`pb-3 ${activeTab==='ghl' ? 'text-white border-b-2 border-cyan-400' : 'text-gray-400'}`}>GHL Channel</button>
        </div>

        {!dealId ? (
          <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-gray-300">Select a deal to view communications</div>
        ) : (
          activeTab === 'comms' ? (
            <CommHub dealId={dealId} />
          ) : (
            <GhlTab dealId={dealId} />
          )
        )}

      </div>
    </div>
  )
}
