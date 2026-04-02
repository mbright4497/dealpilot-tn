"use client"
import React, { useEffect, useState } from 'react'
import { useEva } from './EvaProvider'
import { createBrowserClient } from "@/lib/supabase-browser"

export default function EvaBriefingCard(){
  const { openEva, addMessage } = useEva()
  const [loading,setLoading] = useState(true)
  const [msg,setMsg] = useState<string>('')
  const [chips,setChips] = useState<string[]>([])
  const supabase = createBrowserClient()

  useEffect(()=>{
    let mounted = true
    fetch('/api/eva/briefing',{method:'POST'}).then(r=>r.json()).then(j=>{
      if(!mounted) return
      setMsg(j.message)
      setChips(j.chips||[])
      setLoading(false)
    }).catch(()=>{ if(mounted){ setMsg('Vera briefing unavailable'); setLoading(false)} })
    return ()=>{ mounted=false }
  },[])

  if(loading) return (<div className="bg-[#0f1c2e] border border-[#1e3a5f] rounded-xl p-6 animate-pulse">Loading briefing...</div>)

  async function handleSendPreset(text: string){
    // open drawer and send message to REVA
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
          <img src="/reva-avatar.png" alt="Vera" className="w-10 h-10 rounded-full" />
        </div>
        <div className="flex-1">
          <div className="text-gray-200 leading-relaxed">{msg}</div>

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
