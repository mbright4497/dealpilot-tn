'use client'
import React, {useState} from 'react'
import { useRouter } from 'next/navigation'
import { create } from '@/lib/api'

export default function NewDealPage(){
  const router = useRouter()
  const [step,setStep]=useState(1)
  const [address,setAddress]=useState('')
  const [clientName,setClientName]=useState('')
  const [txType,setTxType]=useState('Purchase')
  const [price,setPrice]=useState('')
  const [loanType,setLoanType]=useState('Conventional')
  const [binding,setBinding]=useState('')
  const [closing,setClosing]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  async function handleSubmit(){
    setLoading(true)
    setError('')
    try{
      const body:any = {
        title: address,
        client_name: clientName,
        type: txType,
        value: price || null,
        loan_type: loanType,
        binding_date: binding || null,
        closing_date: closing || null,
        status: 'Draft'
      }
      const saved = await create('deals', body)
      // trigger deadlines generation via API route
      try{ await fetch('/api/deadlines/generate',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ deal_id: saved.id, binding_agreement_date: binding, loan_type: loanType }) }) }catch(e){ console.warn('deadline generation failed',e) }
      router.push(`/dashboard/deals/${saved.id}`)
    }catch(e:any){
      console.error(e); setError(e.message||'Save failed')
    }finally{ setLoading(false) }
  }

  return (
    <div className="p-6 bg-white">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">New Deal</h1>
      <div className="max-w-xl">
        {step===1 && (
          <div>
            <label className="block font-semibold text-gray-800">Property Address</label>
            <input className="w-full border p-2 mb-3" value={address} onChange={e=>setAddress(e.target.value)} />
            <label className="block font-semibold text-gray-800">Client Name</label>
            <input className="w-full border p-2 mb-3" value={clientName} onChange={e=>setClientName(e.target.value)} />
            <label className="block font-semibold text-gray-800">Transaction Type</label>
            <select className="w-full border p-2 mb-3" value={txType} onChange={e=>setTxType(e.target.value)}>
              <option>Purchase</option>
              <option>Listing</option>
            </select>
            <div className="flex gap-2">
              <button className="px-3 py-2 bg-gray-100" onClick={()=>router.back()}>Cancel</button>
              <button className="px-3 py-2 bg-orange-500 text-white" onClick={()=>setStep(2)}>Next</button>
            </div>
          </div>
        )}
        {step===2 && (
          <div>
            <label className="block font-semibold text-gray-800">Price</label>
            <input className="w-full border p-2 mb-3" value={price} onChange={e=>setPrice(e.target.value)} />
            <label className="block font-semibold text-gray-800">Loan Type</label>
            <select className="w-full border p-2 mb-3" value={loanType} onChange={e=>setLoanType(e.target.value)}>
              <option>Conventional</option>
              <option>FHA</option>
              <option>VA</option>
              <option>Cash</option>
            </select>
            <label className="block font-semibold text-gray-800">Binding Agreement Date</label>
            <input type="date" className="w-full border p-2 mb-3" value={binding} onChange={e=>setBinding(e.target.value)} />
            <label className="block font-semibold text-gray-800">Closing Date</label>
            <input type="date" className="w-full border p-2 mb-3" value={closing} onChange={e=>setClosing(e.target.value)} />
            <div className="flex gap-2">
              <button className="px-3 py-2 bg-gray-100" onClick={()=>setStep(1)}>Back</button>
              <button className="px-3 py-2 bg-orange-500 text-white" onClick={()=>setStep(3)}>Next</button>
            </div>
          </div>
        )}
        {step===3 && (
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Review</h3>
            <div className="mb-3"><strong>Address:</strong> {address}</div>
            <div className="mb-3"><strong>Client:</strong> {clientName}</div>
            <div className="mb-3"><strong>Type:</strong> {txType}</div>
            <div className="mb-3"><strong>Price:</strong> {price}</div>
            <div className="mb-3"><strong>Loan Type:</strong> {loanType}</div>
            <div className="mb-3"><strong>Binding Date:</strong> {binding}</div>
            <div className="mb-3"><strong>Closing Date:</strong> {closing}</div>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <div className="flex gap-2">
              <button className="px-3 py-2 bg-gray-100" onClick={()=>setStep(2)}>Back</button>
              <button className="px-3 py-2 bg-orange-500 text-white" onClick={handleSubmit} disabled={loading}>{loading? 'Saving...':'Submit & Create Deal'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
