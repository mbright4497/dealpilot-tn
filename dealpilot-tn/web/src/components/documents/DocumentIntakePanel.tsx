"use client"
import React, { useState } from 'react'

export default function DocumentIntakePanel({ transactionId }:{ transactionId?:string }){
  const [file, setFile] = useState<File|null>(null)
  const [stage, setStage] = useState<'idle'|'uploading'|'extracting'|'review'>('idle')
  const [extraction, setExtraction] = useState<any>(null)

  async function handleUpload(){
    if(!file) return
    setStage('uploading')
    const fd = new FormData()
    fd.append('file', file)
    if(transactionId) fd.append('transaction_id', transactionId)
    const res = await fetch('/api/docs/upload',{ method:'POST', body: fd })
    const j = await res.json()
    if(!res.ok){ alert(j.error||'upload failed'); setStage('idle'); return }
    const doc = j.document
    setStage('extracting')
    const ext = await fetch('/api/ai/docs/extract',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ document_id: doc.id }) })
    const ej = await ext.json()
    if(!ext.ok){ alert(ej.error||'extract failed'); setStage('idle'); return }
    setExtraction(ej.extraction)
    setStage('review')
  }

  return (
    <div className="bg-[#0a1929] text-white p-4 rounded">
      <div className="mb-2 font-semibold">Upload Contract PDF</div>
      <input type="file" accept="application/pdf" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      <div className="mt-3">
        <button onClick={handleUpload} disabled={!file} className="bg-orange-500 px-3 py-1 rounded">Upload & Extract</button>
      </div>
      <div className="mt-3">Stage: {stage}</div>
    </div>
  )
}
