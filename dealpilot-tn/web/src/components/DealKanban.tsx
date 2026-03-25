"use client"
import React from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'

const columns = [{key:'draft',title:'Draft'},{key:'active',title:'Active'},{key:'pending_close',title:'Pending Close'},{key:'closed',title:'Closed'}]

export default function DealKanban(){
  const supabase = createBrowserClient()
  const [deals,setDeals] = React.useState<any[]>([])

  React.useEffect(()=>{async function load(){const {data} = await supabase.from('deals').select('*'); setDeals(data||[])} load()},[])

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map(col=> (
        <div key={col.key} className="bg-gray-800 p-3 rounded">
          <h4 className="font-semibold">{col.title}</h4>
          <div className="mt-2 space-y-2">
            {deals.filter(d=>d.status===col.key).map(d=> (
              <div key={d.id} className="p-2 bg-gray-900 rounded">{d.title}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
