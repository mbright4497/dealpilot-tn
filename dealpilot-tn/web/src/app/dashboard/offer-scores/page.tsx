"use client"
"use client"
import React, { useState } from 'react'
import { useDeals, useOffers } from '@/lib/hooks'

export default function OfferScoresPage() {
  const { data: offersData, addOffer } = useOffers()
  const offers = offersData?.data || []
  const { data: dealsData } = useDeals()
  const deals = dealsData?.data || []

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ dealId:'', score:5, reason:'' })

  const handleAdd = async ()=>{
    if(!form.dealId) return alert('Select a deal')
    await addOffer({ deal_id: form.dealId, score: form.score, reason: form.reason, date: new Date().toISOString() })
    setOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Offer Scores</h1>
          <button onClick={()=>setOpen(true)} className="bg-blue-600 px-3 py-1 rounded">+ Add Score</button>
        </div>

        {offers.length===0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-gray-900 p-8 text-center">
            <p className="text-lg font-medium">No offer scores yet</p>
            <p className="mt-2 text-sm text-gray-400">Use + Add Score to evaluate an offer and attach it to a deal.</p>
          </div>
        ) : (
          <table className="w-full mt-6 bg-[#0b1220] rounded overflow-hidden">
            <thead className="text-left text-gray-400"><tr><th className="p-2">Deal</th><th className="p-2">Score</th><th className="p-2">Reason</th><th className="p-2">Date</th></tr></thead>
            <tbody>
              {offers.map((o:any)=>(<tr key={o.id} className="border-t border-[#0f1c2e]"><td className="p-2">{deals.find((d:any)=>d.id===o.deal_id)?.address || '—'}</td><td className="p-2">{o.score}</td><td className="p-2">{o.reason}</td><td className="p-2">{new Date(o.date).toLocaleDateString()}</td></tr>))}
            </tbody>
          </table>
        )}

        {open && (
          <div className="mt-4 p-4 bg-slate-900 border border-slate-700 rounded">
            <select className="w-full p-2 rounded bg-black" value={form.dealId} onChange={e=>setForm({...form, dealId: e.target.value})}>
              <option value="">Select deal</option>
              {deals.map((d:any)=>(<option key={d.id} value={d.id}>{d.address}</option>))}
            </select>
            <div className="mt-2 flex gap-2">
              <input type="number" min={1} max={10} value={form.score} onChange={e=>setForm({...form, score: Number(e.target.value)})} className="p-2 rounded bg-black" />
              <input placeholder="Reason" value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} className="flex-1 p-2 rounded bg-black" />
            </div>
            <div className="mt-2 flex justify-end gap-2"><button onClick={()=>setOpen(false)} className="px-3 py-1">Cancel</button><button onClick={handleAdd} className="bg-green-600 px-3 py-1 rounded">Add</button></div>
          </div>
        )}

      </div>
    </div>
  )
}
