"use client"
import React, { useState } from 'react'

export default function ContractUpload({ dealId, onApplied }:{ dealId:string, onApplied?:()=>void }){
  const [file, setFile] = useState<File|null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string|null>(null)

  async function upload() {
    if(!file) return
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try{
      const res = await fetch('/api/eva/parse-contract', { method: 'POST', body: fd })
      const j = await res.json()
      if(!res.ok){ setError(j.error || 'Failed'); setLoading(false); return }
      setResult(j.extracted)
    }catch(e:any){ setError(e.message); }
    setLoading(false)
  }

  async function applyToDeal(){
    if(!result) return
    // map fields to transaction update
    const payload:any = {
      client: result.buyer_name || undefined,
      address: result.property_address || undefined,
      binding: result.binding_date || undefined,
      closing: result.closing_date || undefined,
      notes: result.special_stipulations || undefined,
    }
    try{
      const res = await fetch(`/api/transactions/${dealId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if(res.ok){ if(onApplied) onApplied(); alert('Applied to deal') }
      else { alert('Apply failed') }
    }catch(e:any){ alert('Apply exception') }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 text-white p-4 rounded">
      <div className="mb-3 font-semibold">Upload Contract (PDF)</div>
      <input type="file" accept="application/pdf" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      <div className="mt-3">
        <button onClick={upload} className="bg-orange-500 px-3 py-1 rounded" disabled={loading||!file}>{loading? 'Parsing...' : 'Parse PDF'}</button>
      </div>

      {error && <div className="text-red-400 mt-2">{error}</div>}

      {result && (
        <div className="mt-4">
          <h4 className="font-semibold">Extracted</h4>
          <pre className="text-xs bg-black p-2 rounded mt-2">{JSON.stringify(result, null, 2)}</pre>
          <div className="mt-2 flex gap-2">
            <button onClick={applyToDeal} className="bg-green-600 px-3 py-1 rounded">Apply to Deal</button>
            <button onClick={()=>{ navigator.clipboard.writeText(JSON.stringify(result)); alert('Copied') }} className="bg-gray-700 px-3 py-1 rounded">Copy JSON</button>
          </div>
        </div>
      )}
    </div>
  )
}
