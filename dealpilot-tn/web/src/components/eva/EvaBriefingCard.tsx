"use client"
import React, { useEffect, useState } from 'react'
import { useEva } from './EvaProvider'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function EvaBriefingCard(){
  const { openEva, addMessage } = useEva()
  const [loading,setLoading] = useState(true)
  const [msg,setMsg] = useState<string>('')
  const [chips,setChips] = useState<string[]>([])
  const supabase = createClientComponentClient()

  useEffect(()=>{
    let mounted = true
    fetch('/api/eva/briefing',{method:'POST'}).then(r=>r.json()).then(j=>{
      if(!mounted) return
      setMsg(j.message)
      setChips(j.chips||[])
      setLoading(false)
    }).catch(()=>{ if(mounted){ setMsg('EVA briefing unavailable'); setLoading(false)} })
    return ()=>{ mounted=false }
  },[])

  if(loading) return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] rounded-xl p-6 animate-pulse">Loading briefing...</div>)

  async function handleSendPreset(text: string){
    // open drawer and send message to EVA
    openEva()
    addMessage({ id: String(Date.now()), role: 'user', content: text })
  }

  async function exportCsv(){
    // fetch transactions and build CSV
    const { data } = await supabase.from('transactions').select('address,client,type,status,binding,closing')
    const rows = Array.isArray(data) ? data : []
    const headers = ['Address','Client','Type','Status','Binding Date','Closing Date']
    const csv = [headers.join(',')].concat(rows.map((r:any)=>[
      '"'+String(r.address||'')+'"',
      '"'+String(r.client||'')+'"',
      '"'+String(r.type||'')+'"',
      '"'+String(r.status||'')+'"',
      '"'+String(r.binding||'')+'"',
      '"'+String(r.closing||'')+'"'
    ].join(','))).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'deals.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-[#0f1c2e] border border-[#1e3a5f] rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center font-bold"> 
          <img src="/eva-avatar.png" alt="EVA" className="w-10 h-10 rounded-full" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div className="text-gray-200 leading-relaxed">{msg}</div>
            <div className="flex gap-2">
              <button onClick={()=>handleSendPreset('Prioritize my deals for today')} className="px-3 py-1 bg-[#1e3a5f] text-sm rounded">Prioritize deals</button>
              <button onClick={()=>handleSendPreset('Generate a detailed daily brief for all my deals')} className="px-3 py-1 bg-[#1e3a5f] text-sm rounded">Generate brief</button>
              <button onClick={exportCsv} className="px-3 py-1 bg-[#1e3a5f] text-sm rounded">Export CSV</button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            {chips.map(c=> (
              <button key={c} onClick={() => handleSendPreset(c)} className="bg-[#1e3a5f] text-gray-300 px-3 py-1 rounded-full text-sm">{c}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
