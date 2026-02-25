"use client"
import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function DeadlineTimeline({dealId}:{dealId:string}){
  const supabase = createClientComponentClient()
  const [deadlines,setDeadlines] = React.useState<any[]>([])
  React.useEffect(()=>{async function load(){const {data} = await supabase.from('deadlines').select('*').eq('deal_id',dealId).order('due_date',{ascending:true}); setDeadlines(data||[])} load()},[dealId])

  function color(d:any){ if(d.status==='completed') return 'bg-green-600'; if(d.status==='pending'){ const due = new Date(d.due_date); const now=new Date(); if(due < now) return 'bg-red-600'; if((due.getTime()-now.getTime())<48*3600*1000) return 'bg-yellow-500'; return 'bg-gray-500' } return 'bg-gray-500' }

  return (
    <div className="bg-gray-800 p-4 rounded">
      {deadlines.length===0? <div>No deadlines</div> : (
        <ul>
          {deadlines.map(d=> (
            <li key={d.id} className="flex items-center gap-3 p-2 border-b">
              <div className={`w-3 h-3 rounded-full ${color(d)}`}></div>
              <div className="flex-1">
                <div className="font-semibold">{d.name}</div>
                <div className="text-sm text-gray-300">Due: {d.due_date}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
