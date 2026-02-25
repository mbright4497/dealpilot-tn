"use client"
import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function ComplianceDashboard({dealId}:{dealId:string}){
  const supabase = createClientComponentClient()
  const [checks,setChecks] = React.useState<any|null>(null)

  React.useEffect(()=>{async function load(){const {data} = await supabase.from('compliance_checks').select('*').eq('deal_id',dealId).order('run_at',{ascending:false}).limit(1); setChecks(data?.[0]||null)} load()},[dealId])

  if(!checks) return <div className="bg-gray-800 p-3 rounded">No compliance checks yet</div>
  return (
    <div className="bg-gray-800 p-3 rounded">
      <h3 className="font-semibold">Compliance Score: {checks.score || '—'}</h3>
      <div className="mt-2">Status: {checks.status}</div>
      <pre className="mt-2 text-sm">{JSON.stringify(checks.details,null,2)}</pre>
    </div>
  )
}
