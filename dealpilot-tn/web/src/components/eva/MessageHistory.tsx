"use client"
import React, {useEffect, useState} from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
const supabase = createBrowserClient()

export default function MessageHistory({dealId}:{dealId:number}){
  const [logs, setLogs] = useState<any[]>([])
  useEffect(()=>{ let mounted=true; (async ()=>{ try{ const res = await supabase.from('message_logs').select('*').eq('deal_id', dealId).order('sent_at',{ascending:false}).limit(20); if(mounted) setLogs(res.data||[]) }catch(e){}})(); return ()=>{ mounted=false } },[dealId])

  return (
    <div className="p-3 bg-gray-900 rounded">
      <h4 className="text-sm text-gray-300 mb-2">Message History</h4>
      <div className="space-y-2">
        {logs.map((l:any)=> (
          <div key={l.id} className="p-2 bg-gray-800 rounded">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-200">{l.channel.toUpperCase()}</div>
              <div className="text-xs text-gray-400">{new Date(l.sent_at).toLocaleString()}</div>
            </div>
            <div className="text-xs text-gray-300 mt-1">{l.message_body.slice(0,200)}{l.message_body.length>200?'...':''}</div>
          </div>
        ))}
        {logs.length===0 && <div className="text-xs text-gray-500">No messages yet.</div>}
      </div>
    </div>
  )
}
