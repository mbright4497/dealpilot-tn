'use client'
import React, {useEffect, useState} from 'react'

export default function FormFillModal({ formId, onClose }:{ formId:string, onClose:()=>void }){
  const [form, setForm] = useState<any|null>(null)
  const [data, setData] = useState<Record<string,any>>({})
  const [aiFilled, setAiFilled] = useState<Record<string,boolean>>({})
  useEffect(()=>{ fetch('/api/forms').then(r=>r.json()).then(j=>{ const f = j.forms.find((x:any)=>x.id===formId); setForm(f) }) },[formId])
  async function handleAIFill(){
    const res = await fetch('/api/forms',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ formId, transactionId: 1 }) })
    const j = await res.json()
    setData(j.prefill||{})
    const filled:Record<string,boolean> = {}
    Object.keys(j.prefill||{}).forEach(k=>{ if(j.prefill[k]) filled[k]=true })
    setAiFilled(filled)
  }
  function renderField(f:any){
    const val = data[f.id]||''
    return (
      <div key={f.id} className="mb-3">
        <label className="block text-sm font-medium text-gray-700">{f.label} {f.required? '*':''} {aiFilled[f.id] && <span className="ml-2 text-xs text-orange-500">AI</span>}</label>
        {f.type==='text' && <input value={val} onChange={e=>setData({...data,[f.id]:e.target.value})} className="w-full border p-2 rounded" placeholder={f.placeholder||''} />}
        {f.type==='date' && <input type="date" value={val} onChange={e=>setData({...data,[f.id]:e.target.value})} className="w-full border p-2 rounded" />}
        {f.type==='number' && <input type="number" value={val} onChange={e=>setData({...data,[f.id]:e.target.value})} className="w-full border p-2 rounded" />}
        {f.type==='select' && <select value={val} onChange={e=>setData({...data,[f.id]:e.target.value})} className="w-full border p-2 rounded">{(f.options||[]).map((o:string)=>(<option key={o} value={o}>{o}</option>))}</select>}
        {f.type==='checkbox' && <input type="checkbox" checked={!!val} onChange={e=>setData({...data,[f.id]:e.target.checked})} />}
      </div>
    )
  }
  if(!form) return <div className="fixed inset-0 flex items-center justify-center bg-black/40">Loading...</div>
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-900 text-white rounded-lg w-full max-w-3xl p-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-400">{form.code}</div>
            <div className="text-lg font-bold">{form.name}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{ setData({}); setAiFilled({}) }} className="px-3 py-2 bg-gray-700 rounded">Clear All</button>
            <button onClick={handleAIFill} className="px-3 py-2 bg-orange-500 rounded">AI Pre-Fill</button>
            <button onClick={onClose} className="px-3 py-2 bg-gray-600 rounded">Close</button>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Party Info</h4>
          { (form.fields||[]).filter((f:any)=>['buyerName','sellerName','tenantName','landlordName'].includes(f.id)).map(renderField) }
        </div>
        <div>
          <h4 className="font-semibold mb-2">Property</h4>
          { (form.fields||[]).filter((f:any)=>['propertyAddress','city','zip','county'].includes(f.id)).map(renderField) }
        </div>
        <div>
          <h4 className="font-semibold mb-2">Financial</h4>
          { (form.fields||[]).filter((f:any)=>['purchasePrice','earnestMoneyAmount','monthlyRent','securityDepositAmount','compensationAmount','compensationPercent','loanAmount'].includes(f.id)).map(renderField) }
        </div>
        <div>
          <h4 className="font-semibold mb-2">Dates & Terms</h4>
          { (form.fields||[]).filter((f:any)=>['agreementDate','leaseStartDate','leaseEndDate','closingDate','inspectionDays','feasibilityStudyDays'].includes(f.id)).map(renderField) }
        </div>

      </div>
    </div>
  )
}
