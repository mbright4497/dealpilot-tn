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
      <h2 className="text-xl font-bold mb-4">TN Deadline Calculator</h2>
      <div className="flex gap-2 mb-4">
        <input type="date" value={binding} onChange={e=>setBinding(e.target.value)} className="border p-2" />
        <input type="date" value={closing} onChange={e=>setClosing(e.target.value)} className="border p-2" />
        <select className="border p-2">
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
              <div className="font-bold">{d.title}</div>
              <div className="text-sm text-gray-500">{new Date(d.due_date).toLocaleDateString()}</div>
            </div>
            <div className="text-sm text-gray-700">{Math.ceil((new Date(d.due_date).getTime()-new Date().getTime())/(1000*60*60*24))} days</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">Note: Tennessee business day rules apply; deadlines on weekends/holidays move to next business day.</p>
    </div>
  )
}
