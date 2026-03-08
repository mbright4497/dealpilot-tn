'use client'
<div className="mb-3"><button onClick={()=>router.back()} className="text-slate-400 hover:text-orange-400 flex items-center gap-2">← Back</button></div>
'use client'
import React
import {useRouter} from "next/navigation"
, {useEffect, useState} from 'react'

export default function DealPlaybook(){
  const router = useRouter()
  const [q, setQ] = useState('')
  const [phase, setPhase] = useState<'All'|'Contract'|'Inspection'|'Appraisal'|'Closing'>('All')

  const forms = [
    { code:'RF401', name:'Purchase & Sale', desc:'Standard purchase agreement', phase:'Contract', required:true },
    { code:'RF403', name:'New Construction Addendum', desc:'New construction specifics', phase:'Contract', required:true },
    { code:'RF201', name:'Property Disclosure', desc:'Seller disclosures', phase:'Contract', required:false },
    { code:'RF304', name:'Disclaimer', desc:'Agent disclaimers', phase:'Contract', required:false },
    { code:'RF656', name:'Notification to Seller', desc:'Notices and responses', phase:'Earnest Money & Loan', required:true },
    { code:'RF653', name:'Amendment for Repairs', desc:'Amendment form', phase:'Inspection', required:false },
    { code:'RF625', name:'FHA/VA Addendum', desc:'Lender addendum', phase:'Appraisal & Title', required:false },
    { code:'RF657', name:'Closing Date Amendment', desc:'Change closing date', phase:'Underwriting & Clear to Close', required:false },
    { code:'RF660', name:'Final Inspection', desc:'Final walkthrough report', phase:'Closing', required:true },
  ]

  const visible = forms.filter(f=> (phase==='All' || f.phase===phase) && (q===''|| f.name.toLowerCase().includes(q.toLowerCase())||f.code.toLowerCase().includes(q.toLowerCase())))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">TN Deal Playbook</h1>
          <div className="text-sm text-gray-500">Your guide to every form at every stage of a Tennessee real estate transaction</div>
        </div>
        <div className="w-60">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search RF number or keyword" className="w-full border p-2 rounded" />
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        {['All','Contract','Inspection','Appraisal','Closing'].map(p=> (
          <button key={p} onClick={()=>setPhase(p as any)} className={`px-3 py-1 rounded ${phase===p? 'bg-orange-500 text-white':'bg-gray-100'}`}>{p}</button>
        ))}
      </div>

      <div className="mb-4">
        <div className="p-3 bg-orange-50 border border-orange-100 rounded flex items-center gap-3">
          <img src="/eva-avatar.png" alt="EVA" className="w-10 h-10 rounded-full" />
          <div>
            <div className="font-semibold">EVA Insight</div>
            <div className="text-sm text-gray-600">You have 1 overdue deadline and 2 deadlines due within 3 days. Review 78 Pine Rd first.</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map(f=> (
          <details key={f.code} className="p-4 bg-white rounded shadow">
            <summary className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-xs text-gray-400">{f.code}</div>
                <div className="font-semibold">{f.name}</div>
                <div className="text-sm text-gray-500">{f.desc}</div>
              </div>
              <div className="text-right">
                <div className={`px-2 py-1 rounded text-xs ${f.required? 'bg-red-100 text-red-700':'bg-gray-100 text-gray-700'}`}>{f.required? 'Required':'Optional'}</div>
                <div className="text-sm text-gray-400 mt-2">{f.phase}</div>
              </div>
            </summary>
            <div className="mt-3 text-sm text-gray-700">
              <p><strong>When to use:</strong> {f.desc} — use during {f.phase}.</p>
              <p><strong>Who fills it out:</strong> Agent / {f.required? 'Buyer/Seller': 'Buyer or Seller'}</p>
              <p><strong>Key fields:</strong> [TODO: list key fields]</p>
              <p><strong>Related forms:</strong> [TODO]</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

