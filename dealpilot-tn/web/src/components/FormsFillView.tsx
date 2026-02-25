'use client'
import React, {useState} from 'react'
import { FORM_LIST } from '@/lib/formSchemas'

export default function FormsFillView(){
  const forms = FORM_LIST.map(f=>({id:f.id,name:f.name,desc:f.description,status:'blank',modified:null}))
  const [selected,setSelected]=useState<any|null>(null)

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Forms & Documents</h2>
      <div className="grid grid-cols-3 gap-4">
        {forms.map((f:any)=>(
          <div key={f.id} className="p-4 bg-white shadow rounded">
            <div className="font-bold">{f.name}</div>
            <div className="text-sm text-gray-600">{f.desc}</div>
            <div className="mt-2 flex justify-between items-center">
              <div className="text-xs text-gray-500">Status: {f.status}</div>
              <button onClick={()=>setSelected(f)} className="px-2 py-1 bg-orange-500 text-white rounded">Open</button>
            </div>
          </div>
        ))}
      </div>

      {selected && <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-bold">{selected.name}</h3>
        <p className="text-sm text-gray-600">Progress: 0%</p>
        <button className="mt-2 px-3 py-2 bg-blue-600 text-white rounded">Start AI Fill</button>
      </div>}
    </div>
  )
}
