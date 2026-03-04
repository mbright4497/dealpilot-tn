"use client"
import React, { useEffect, useState } from 'react'
import { useChecklists, useDeals } from '@/lib/hooks'

const STANDARD = [
  'Contract Signed', 'Earnest Money Deposited', 'Inspection Scheduled', 'Inspection Complete', 'Appraisal Ordered', 'Appraisal Complete', 'Title Search Clear', 'Loan Approved', 'Final Walkthrough', 'Closing Scheduled'
]

export default function ChecklistsPage(){
  const { data, addChecklist } = useChecklists()
  const checks = data?.data || []
  const { data: dealsData } = useDeals()
  const deals = dealsData?.data || []
  const [selectedDeal, setSelectedDeal] = useState('')

  async function generate(){
    if(!selectedDeal) return alert('Select a deal')
    const items = STANDARD.map((t,i)=>({ label:t, status:'pending', due: null, order:i }))
    await addChecklist({ deal_id: selectedDeal, items, created_at: new Date().toISOString() })
    alert('Checklist generated')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Checklists</h1>
        </div>

        {checks.length===0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-gray-900 p-8 text-center">
            <p className="text-lg font-medium">No checklists yet</p>
            <p className="mt-2 text-sm text-gray-400">Generate a standard Tennessee buyer checklist for a deal.</p>
            <div className="mt-4 flex justify-center gap-2">
              <select value={selectedDeal} onChange={e=>setSelectedDeal(e.target.value)} className="bg-black p-2 rounded">
                <option value="">Select deal</option>
                {deals.map((d:any)=>(<option key={d.id} value={d.id}>{d.address}</option>))}
              </select>
              <button onClick={generate} className="bg-green-600 px-3 py-1 rounded">Generate Checklist</button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {checks.map((c:any)=>(
              <div key={c.id} className="bg-gray-900 p-4 rounded border border-white/10">
                <h3 className="font-semibold">Checklist for {deals.find((d:any)=>d.id===c.deal_id)?.address || c.deal_id}</h3>
                <ul className="mt-2 space-y-1">
                  {c.items.map((it:any, idx:number)=>(<li key={idx} className="flex items-center gap-2"><input type="checkbox" defaultChecked={it.status==='done'} /> <span>{it.label} {it.due? `— due ${new Date(it.due).toLocaleDateString()}` : ''}</span></li>))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}