"use client"
import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'

export default function ComplianceScore({dealId}:{dealId:string}){
  const supabase = createBrowserClient()
  const [percent,setPercent] = useState<number | null>(null)
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      // fetch checklist items
      const { data: items } = await supabase.from('checklist_items').select('id,completed,status').eq('transaction_id', dealId)
      const checklist = Array.isArray(items)? items : []
      const completedCount = checklist.filter((c:any)=> c.status==='done' || c.completed).length

      // fetch documents list
      let docs: any[] = []
      try{
        const { data } = await supabase.storage.from('deal-documents').list(dealId)
        docs = data || []
      }catch(e){ docs = [] }

      const requiredDocs = ['contract','addendum','inspection','appraisal','title']
      const docNames = docs.map(d=> (d.name||'').toLowerCase())
      const uploadedRequired = requiredDocs.filter(r=> docNames.some(n=> n.includes(r))).length

      const totalRequired = (requiredDocs.length) + Math.max(1, checklist.length)
      const score = Math.round(((uploadedRequired + completedCount) / totalRequired) * 100)
      if(mounted) setPercent(score)
      setLoading(false)
    }
    load()
    return ()=>{ mounted=false }
  },[dealId])

  if(loading || percent===null) return (<div className="text-gray-400">Compliance: calculating...</div>)

  const color = percent<50? 'text-red-400' : percent<80? 'text-yellow-300' : 'text-green-400'

  return (
    <div className="flex items-center gap-4">
      <svg width={64} height={64} viewBox="0 0 100 100">
        <g transform="translate(50,50)">
          <circle r={30} fill="transparent" stroke="#102234" strokeWidth={10} />
          <circle r={30} fill="transparent" stroke="#17374f" strokeWidth={10} strokeDasharray={`${2*Math.PI*30}`} strokeDashoffset={0} />
          <circle r={30} fill="transparent" stroke={percent<50? '#dc2626': percent<80? '#f59e0b':'#16a34a'} strokeWidth={10} strokeDasharray={`${2*Math.PI*30}`} strokeDashoffset={`${2*Math.PI*30 - (percent/100)*(2*Math.PI*30)}`} transform="rotate(-90)" />
        </g>
      </svg>
      <div>
        <div className="text-sm text-gray-300">Compliance</div>
        <div className={`text-2xl font-bold ${color}`}>{percent}%</div>
      </div>
    </div>
  )
}
