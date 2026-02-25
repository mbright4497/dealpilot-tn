'use client'
import React, {useState} from 'react'
import { createChecklistInstance, updateTask, checklistProgress } from '@/lib/tc-checklist'

export default function TCChecklist(){
  const [list,setList]=useState(() => createChecklistInstance())

  function toggle(key:any){
    const next = list.map(l=> l.key===key?{...l, status: l.status==='done'?'todo':'done', updated_at: new Date().toISOString() }: l)
    setList(next)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Transaction Checklist</h2>
      <div className="mb-4">
        <div className="w-full bg-gray-200 h-3 rounded"><div className="bg-orange-500 h-3 rounded" style={{width: checklistProgress(list)+'%'}}></div></div>
        <div className="text-sm text-gray-600 mt-1">Progress: {checklistProgress(list)}%</div>
      </div>

      <div className="grid gap-2">
        {list.map(item=>(
          <div key={item.key} className="p-3 bg-white shadow rounded flex items-center justify-between">
            <div>
              <div className="font-bold">{item.title}</div>
              <div className="text-xs text-gray-500">{item.updated_at}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={item.status==='done'} onChange={()=>toggle(item.key)} /> <span className="text-sm">Done</span></label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
