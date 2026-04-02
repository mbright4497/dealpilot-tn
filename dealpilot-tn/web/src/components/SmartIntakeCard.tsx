'use client'
import React, { useState } from 'react'

export default function SmartIntakeCard(){
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any|null>(null)
  const [error, setError] = useState<string| null>(null)

  async function onFile(e:any){
    const f = e.target.files && e.target.files[0]
    if(!f) return
    if(f.type !== 'application/pdf'){ setError('Please upload a PDF'); return }
    setError(null)
    setLoading(true)
    setSummary(null)
    try{
      const buf = await f.arrayBuffer()
      const b64 = Buffer.from(buf).toString('base64')
      const res = await fetch('/api/contract-parse', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ fileBase64: b64 }) })
      if(!res.ok){ setError('Failed to parse'); setLoading(false); return }
      const j = await res.json()
      // expected { fields, issues, timeline }
      setSummary(j)
    }catch(e:any){ console.error(e); setError(String(e)) }
    setLoading(false)
  }

  async function applyToDeal(){
    if(!summary) return
    setLoading(true)
    try{
      const res = await fetch('/api/intake-apply', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ fields: summary.fields, timeline: summary.timeline }) })
      const j = await res.json()
      if(res.ok && j.success){
        alert('Applied to deal: '+j.transactionId)
        setSummary(null)
      } else {
        alert('Apply failed')
      }
    }catch(e){ console.error(e); alert('Apply failed') }
    setLoading(false)
  }

  return (
    <div className="mt-4 bg-[#0f1724] border border-gray-800 rounded-lg p-4 max-h-[400px] overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">New Deal</h3>
          <div className="text-sm text-gray-400">Upload your signed Purchase &amp; Sale Agreement — Vera handles the rest.</div>
        </div>
      </div>

      <div className="mt-3">
        <label className="inline-flex items-center gap-2">
          <input id="smart-intake-input" type="file" accept="application/pdf" onChange={onFile} className="hidden" />
          <button className="px-3 py-2 bg-orange-500 text-black rounded font-medium">Upload Contract</button>
        </label>
      </div>

      {loading && <div className="mt-3 text-gray-400">Vera is reading your contract...</div>}
      {error && <div className="mt-3 text-red-400">{error}</div>}

      {summary && (
        <div className="mt-3 bg-[#071224] p-3 rounded border border-gray-800">
          <div className="font-semibold text-white">{summary.fields?.propertyAddress || 'Address not found'}</div>
          <div className="text-sm text-gray-300">Buyers: <span className="font-medium">{summary.fields?.buyerNames || '—'}</span></div>
          <div className="text-sm text-gray-300">Sellers: <span className="font-medium">{summary.fields?.sellerNames || '—'}</span></div>
          <div className="text-sm text-gray-300">Price: <span className="font-medium">{summary.fields?.purchasePrice ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(summary.fields.purchasePrice)) : '—'}</span></div>
          <div className="mt-2 text-sm text-gray-300">Key Dates:</div>
          <ul className="text-sm text-gray-300 ml-3">
            <li>Binding: <span className="font-medium">{summary.fields?.bindingDate || '—'}</span></li>
            <li>Inspection End: <span className="font-medium">{summary.fields?.inspectionEndDate || '—'}</span></li>
            <li>Closing: <span className="font-medium">{summary.fields?.closingDate || '—'}</span></li>
          </ul>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded ${summary.issues?.length? 'bg-red-600':'bg-gray-700'} text-white text-xs`}>Issues: {summary.issues?.length || 0}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={applyToDeal} className="px-3 py-2 bg-green-600 text-white rounded">Apply to Deal</button>
            <button onClick={()=>setSummary(null)} className="text-gray-400">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  )
}
