"use client"
import React, { useEffect, useState } from 'react'

export default function NotificationBanner(){
  const [items, setItems] = useState<any[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(()=>{
    async function load(){
      const res = await fetch('/api/deal-deadlines/next3')
      if(!res.ok) return
      const j = await res.json()
      setItems(j || [])
    }
    load()
  },[])

  if(dismissed || items.length===0) return null
  const it = items[0]
  const days = it.daysAway ?? 0
  const color = days < 0 ? 'bg-red-700' : days <=1 ? 'bg-red-600' : 'bg-yellow-600'

  return (
    <div className={`w-full p-3 rounded ${color} text-white mb-4`}> 
      <div className="flex justify-between items-center">
        <div>URGENT: <strong>{it.address}</strong> has <strong>{it.label}</strong> due in <strong>{Math.max(days,0)}</strong> day(s)</div>
        <div><button onClick={()=>setDismissed(true)} className="underline">Dismiss</button></div>
      </div>
    </div>
  )
}
