"use client"
import React, { useState } from 'react'

export default function EVATimelineBuilder({ transactionId }:{ transactionId:string }){
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')

  async function build(){
    setRunning(true)
    setStatus('Generating deadlines...')
    const res = await fetch('/api/ai/deals/build-timeline',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ transaction_id: transactionId }) })
    const j = await res.json()
    if(!res.ok){ alert(j.error||'failed'); setRunning(false); return }
    setStatus(`Created ${j.deadlinesCount} deadlines and ${j.itemsCount} checklist items.`)
    setRunning(false)
    // notify
    window.dispatchEvent(new CustomEvent('timeline:built',{ detail: { transactionId } }))
  }

  return (
    <div className="bg-[#0a1929] p-3 rounded text-white">
      <button onClick={build} disabled={running} className="bg-orange-500 px-3 py-1 rounded">{running? 'Building...' : 'Build Timeline from Contract'}</button>
      <div className="text-sm mt-2">{status}</div>
    </div>
  )
}
