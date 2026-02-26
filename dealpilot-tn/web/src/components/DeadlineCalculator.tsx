'use client'
import React, {useState} from 'react'
import { calculateTNDeadlines } from '@/lib/tn-deadlines'

export default function DeadlineCalculator(){
  const [binding,setBinding]=useState('')
  const [closing,setClosing]=useState('')
  const [deadlines,setDeadlines]=useState<any[]>([])

  function run(){
    if(!binding) return
    const res = calculateTNDeadlines(binding)
    setDeadlines(res)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-900">TN Deadline Calculator</h2>
      <div className="flex gap-2 mb-4">
        <input type="date" value={binding} onChange={e=>setBinding(e.target.value)} className="border p-2 text-gray-900" />
        <input type="date" value={closing} onChange={e=>setClosing(e.target.value)} className="border p-2 text-gray-900" />
        <select className="border p-2 text-gray-900">
          <option>Standard Purchase</option>
          <option>New Construction</option>
          <option>Land/Lot</option>
        </select>
        <button onClick={run} className="bg-orange-500 text-white p-2 rounded">Calculate</button>
      </div>

      <div className="space-y-2">
        {deadlines.map(d=>(
          <div key={d.key} className="p-3 bg-white shadow rounded flex justify-between">
            <div>
              <div className="font-bold text-gray-900">{d.title}</div>
              <div className="text-sm text-gray-600">{new Date(d.due_date).toLocaleDateString()}</div>
            </div>
            <div className="text-sm text-gray-600">{Math.ceil((new Date(d.due_date).getTime()-new Date().getTime())/(86400000))} days</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">Note: Tennessee business day rules apply; deadlines on weekends/holidays move to next business day.</p>
    </div>
  )
}
