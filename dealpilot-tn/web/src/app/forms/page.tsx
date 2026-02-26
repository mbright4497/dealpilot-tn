'use client'
import React, {useEffect, useState} from 'react'
import Link from 'next/link'
import FormFillModal from '@/components/FormFillModal'

export default function FormsPage(){
  const [forms, setForms] = useState<any[]>([])
  const [filter, setFilter] = useState<'all'|'purchase'|'lease'|'compensation'|'application'>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<any|null>(null)
  useEffect(()=>{ fetch('/api/forms').then(r=>r.json()).then(j=>setForms(j.forms||[])) },[])
  const visible = forms.filter(f=> (filter==='all'||f.category===filter) && (q===''|| f.name.toLowerCase().includes(q.toLowerCase())||f.code.toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Forms Library</h1>
        <div className="text-sm text-gray-500">{visible.length} forms available — More forms coming soon</div>
      </div>
      <div className="mb-4 flex gap-3 items-center">
        <div className="flex gap-2">
          {['all','purchase','lease','compensation','application'].map((c:any)=> (
            <button key={c} onClick={()=>setFilter(c)} className={`px-3 py-1 rounded ${filter===c? 'bg-orange-500 text-white':'bg-gray-100'}`}>{c==='all'? 'All': c.charAt(0).toUpperCase()+c.slice(1)}</button>
          ))}
        </div>
        <div className="flex-1">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search forms by name or code" className="w-full border p-2 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(f=> (
          <div key={f.id} className="p-4 bg-white rounded shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-400">{f.code}</div>
                <div className="font-semibold text-lg">{f.name}</div>
                <div className="text-sm text-gray-500">{f.description}</div>
              </div>
              <div className="text-right">
                <div className={`px-2 py-1 rounded text-xs ${f.category==='compensation'?'bg-blue-100 text-blue-700': f.category==='lease'?'bg-green-100 text-green-700': f.category==='purchase'?'bg-orange-100 text-orange-700':'bg-purple-100 text-purple-700'}`}>{f.category}</div>
                <div className="text-sm text-gray-400 mt-2">{f.pages} pages</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={()=>setSelected(f)} className="px-3 py-2 bg-orange-500 text-white rounded">Fill Out</button>
              <button onClick={()=>alert(JSON.stringify(f, null, 2))} className="px-3 py-2 border rounded">View Details</button>
            </div>
          </div>
        ))}
      </div>

      {selected && <FormFillModal formId={selected.id} onClose={()=>setSelected(null)} />}
    </div>
  )
}
