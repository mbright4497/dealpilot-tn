"use client"
import React, { useEffect, useState } from 'react'

export default function EVAActionPlanCard({ transactionId }:{ transactionId?:string }){
  const [plan, setPlan] = useState<any|null>(null)

  useEffect(()=>{
    async function load(){
      if(!transactionId) return
      const res = await fetch(`/api/deals/${transactionId}/action-plan`)
      if(!res.ok) return
      const j = await res.json()
      setPlan(j.latest)
    }
    load()
  },[transactionId])

  if(!plan) return null
  return (
    <div className="bg-[#0a1929] text-white p-4 rounded">
      <h3 className="font-semibold">Today EVA will:</h3>
      <div className="mt-2 text-sm">
        {plan.actions_json && plan.actions_json.raw ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-300">{String(plan.summary || plan.actions_json.raw)}</pre>
        ) : (
          <div className="text-gray-300">{plan.summary}</div>
        )}
      </div>
    </div>
  )
}
