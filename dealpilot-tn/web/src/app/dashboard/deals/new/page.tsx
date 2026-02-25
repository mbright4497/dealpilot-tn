"use client"

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function NewDeal(){
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [step,setStep] = React.useState(1)
  const [form,setForm] = React.useState<any>({deal_type:'buyer',property:{},buyer_names:[],seller_names:[],sale_price:null,loan_type:'conventional',earnest_money:null,binding_agreement_date:'',closing_date:''})

  function update(key:any,val:any){ setForm((f:any)=>({...f,[key]:val})) }

  async function createDeal(){
    const payload = {
      title: form.property.address || 'New Deal',
      status: 'draft',
      deal_type: form.deal_type,
      loan_type: form.loan_type,
      sale_price: form.sale_price,
      binding_agreement_date: form.binding_agreement_date || null,
      closing_date: form.closing_date || null,
      property: form.property
    }
    const { data, error } = await supabase.from('deals').insert([payload]).select().single()
    if(error){ console.error(error); return }
    // Auto-generate deadlines client-side
    if(data?.binding_agreement_date){ await generateDeadlines(data.id, data.binding_agreement_date, data.loan_type) }
    router.push(`/dashboard/deals/${data.id}`)
  }

  async function generateDeadlines(dealId:any, bindingDate:any, loanType:any){
    const base = new Date(bindingDate)
    const deadlines:any[] = []
    // 3 days loan app if not cash
    if(loanType !== 'cash'){
      let d = new Date(base); d.setDate(d.getDate()+3)
      deadlines.push({deal_id:dealId,name:'Loan Application',due_date:d.toISOString().slice(0,10),status:'pending',category:'financing'})
      deadlines.push({deal_id:dealId,name:'Credit Report',due_date:d.toISOString().slice(0,10),status:'pending',category:'financing'})
    } else {
      let d = new Date(base); d.setDate(d.getDate()+5)
      deadlines.push({deal_id:dealId,name:'Proof of Funds',due_date:d.toISOString().slice(0,10),status:'pending',category:'funding'})
    }
    // 14 days insurance & appraisal
    let d14 = new Date(base); d14.setDate(d14.getDate()+14)
    deadlines.push({deal_id:dealId,name:'Hazard Insurance Ordered',due_date:d14.toISOString().slice(0,10),status:'pending',category:'insurance'})
    if(loanType !== 'cash') deadlines.push({deal_id:dealId,name:'Appraisal Ordered',due_date:d14.toISOString().slice(0,10),status:'pending',category:'appraisal'})

    for(const dl of deadlines){ await supabase.from('deadlines').insert([dl]) }
  }

  return (
    <div className="dp-bg-dark min-h-screen p-6 text-white">
      <h1 className="text-2xl">Create New Deal</h1>
      <div className="mt-4 bg-gray-800 p-4 rounded">
        {step===1 && (
          <div>
            <label>Deal Type</label>
            <select value={form.deal_type} onChange={e=>update('deal_type',e.target.value)} className="block p-2 bg-gray-900">
              <option value="buyer">Buyer Representation</option>
              <option value="listing">Listing</option>
            </select>
            <label className="mt-2">Property Address</label>
            <input value={form.property.address||''} onChange={e=>update('property',{...form.property,address:e.target.value,county:form.property.county})} className="block p-2 bg-gray-900 w-full" />
            <label className="mt-2">County</label>
            <input value={form.property.county||''} onChange={e=>update('property',{...form.property,address:form.property.address,county:e.target.value})} className="block p-2 bg-gray-900 w-full" />
            <div className="mt-4"><button onClick={()=>setStep(2)} className="dp-btn">Next</button></div>
          </div>
        )}

        {step===2 && (
          <div>
            <label>Buyer Names (comma separated)</label>
            <input value={form.buyer_names.join(', ')} onChange={e=>update('buyer_names', e.target.value.split(',').map((s:string)=>s.trim()))} className="block p-2 bg-gray-900 w-full" />
            <label className="mt-2">Seller Names (comma separated)</label>
            <input value={form.seller_names.join(', ')} onChange={e=>update('seller_names', e.target.value.split(',').map((s:string)=>s.trim()))} className="block p-2 bg-gray-900 w-full" />
            <div className="mt-4 flex gap-2"><button onClick={()=>setStep(1)} className="dp-btn">Back</button><button onClick={()=>setStep(3)} className="dp-btn">Next</button></div>
          </div>
        )}

        {step===3 && (
          <div>
            <label>Sale Price</label>
            <input type="number" value={form.sale_price||''} onChange={e=>update('sale_price', Number(e.target.value))} className="block p-2 bg-gray-900 w-full" />
            <label className="mt-2">Loan Type</label>
            <select value={form.loan_type} onChange={e=>update('loan_type',e.target.value)} className="block p-2 bg-gray-900">
              <option value="conventional">Conventional</option>
              <option value="VA">VA</option>
              <option value="FHA">FHA</option>
              <option value="USDA">USDA</option>
              <option value="cash">Cash</option>
            </select>
            <label className="mt-2">Earnest Money</label>
            <input type="number" value={form.earnest_money||''} onChange={e=>update('earnest_money', Number(e.target.value))} className="block p-2 bg-gray-900 w-full" />
            <div className="mt-4 flex gap-2"><button onClick={()=>setStep(2)} className="dp-btn">Back</button><button onClick={()=>setStep(4)} className="dp-btn">Next</button></div>
          </div>
        )}

        {step===4 && (
          <div>
            <label>Binding Agreement Date</label>
            <input type="date" value={form.binding_agreement_date||''} onChange={e=>update('binding_agreement_date', e.target.value)} className="block p-2 bg-gray-900 w-full" />
            <label className="mt-2">Closing Date</label>
            <input type="date" value={form.closing_date||''} onChange={e=>update('closing_date', e.target.value)} className="block p-2 bg-gray-900 w-full" />
            <div className="mt-4 flex gap-2"><button onClick={()=>setStep(3)} className="dp-btn">Back</button><button onClick={()=>setStep(5)} className="dp-btn">Next</button></div>
          </div>
        )}

        {step===5 && (
          <div>
            <h3>Review</h3>
            <pre className="bg-gray-900 p-3 rounded">{JSON.stringify(form, null, 2)}</pre>
            <div className="mt-4 flex gap-2"><button onClick={()=>setStep(4)} className="dp-btn">Back</button><button onClick={createDeal} className="dp-btn">Create Deal</button></div>
          </div>
        )}
      </div>
    </div>
  )
}
