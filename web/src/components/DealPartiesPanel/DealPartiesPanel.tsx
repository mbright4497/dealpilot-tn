import React, {useEffect, useState} from 'react'

type Party = { role:string, name:string, phone?:string, email?:string }

export default function DealPartiesPanel({ transactionId }:{transactionId:number}){
  const [loading,setLoading]=useState(true)
  const [parties,setParties]=useState<Party[]>([])
  useEffect(()=>{
    let mounted=true
    setLoading(true)
    fetch(`/api/communications/contacts?deal_id=${transactionId}`).then(r=>r.json()).then(j=>{ if(!mounted) return; setParties((j.contacts||[]).map((c:any)=>({ role:c.role, name:c.contacts?.name || c.contacts?.fullname || '', phone:c.contacts?.phone, email:c.contacts?.email }))); setLoading(false) }).catch(()=>{ if(mounted) setLoading(false) })
    return ()=>{ mounted=false }
  },[transactionId])

  return (
    <div className="bg-gray-800 text-white p-4 rounded-md shadow transition-all">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Deal Parties</h3>
        <div className="text-sm text-gray-400">Roles: Buyer, Seller, Agent</div>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 bg-gray-700 rounded animate-pulse" />
            <div className="h-10 bg-gray-700 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-2">
            {parties.length===0 && <div className="text-gray-400">No parties yet.</div>}
            {parties.map((p,i)=>(
              <div key={i} className="p-2 rounded bg-gray-700 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">{p.role}</div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.email || p.phone}</div>
                </div>
                <div className="text-xs text-gray-300">
                  {p.phone && <a className="block" href={`tel:${p.phone}`}>Call</a>}
                  {p.email && <a className="block" href={`mailto:${p.email}`}>Email</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
