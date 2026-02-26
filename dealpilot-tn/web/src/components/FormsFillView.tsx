'use client'
import React, {useState} from 'react'
import { FORM_LIST } from '@/lib/formSchemas'

type FormItem = { id:string; name:string; desc:string; status:string; modified:string|null; fields?: string[] }

const FORM_FIELDS: Record<string, string[]> = {
  'rf401': ['Buyer Name','Seller Name','Property Address','Purchase Price','Earnest Money','Closing Date','Binding Date','Loan Type','Financing Contingency Days','Inspection Period Days'],
  'rf403': ['Buyer Name','Seller Name','Property Address','Builder/Developer','Purchase Price','Earnest Money','Estimated Completion','Closing Date'],
  'rf404': ['Buyer Name','Seller Name','Property Address (Lot/Land)','Purchase Price','Earnest Money','Closing Date','Survey Required','Zoning Classification'],
  'rf421': ['Landlord Name','Tenant Name','Property Address','Monthly Rent','Security Deposit','Lease Start Date','Lease End Date','Utilities Included'],
  'rf651': ['Original Contract Date','Buyer Name','Seller Name','Property Address','Amendment Description','New Price (if changed)','New Closing Date (if changed)'],
  'rf625': ['Buyer Name','Seller Name','Property Address','VA/FHA Case Number','Loan Amount','Appraised Value'],
}

export default function FormsFillView(){
  const forms: FormItem[] = FORM_LIST.map(f=>({id:f.id,name:f.name,desc:f.description,status:'blank',modified:null}))
  const [selected, setSelected] = useState<FormItem|null>(null)
  const [formData, setFormData] = useState<Record<string,string>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  function openForm(f: FormItem) {
    setSelected(f)
    setFormData({})
    setAiDone(false)
  }

  function handleAIFill() {
    if (!selected) return
    setAiLoading(true)
    setAiDone(false)
    const fields = FORM_FIELDS[selected.id] || ['Field 1','Field 2','Field 3']
    setTimeout(() => {
      const filled: Record<string,string> = {}
      fields.forEach(f => {
        if (f.includes('Name') && f.includes('Buyer')) filled[f] = 'Alice Johnson'
        else if (f.includes('Name') && f.includes('Seller')) filled[f] = 'Bob Martinez'
        else if (f.includes('Address')) filled[f] = '123 Maple St, Johnson City, TN'
        else if (f.includes('Price')) filled[f] = '$285,000'
        else if (f.includes('Earnest')) filled[f] = '$5,000'
        else if (f.includes('Closing Date')) filled[f] = '2026-03-15'
        else if (f.includes('Binding')) filled[f] = '2026-02-01'
        else if (f.includes('Loan Type')) filled[f] = 'VA'
        else if (f.includes('Rent')) filled[f] = '$1,200/mo'
        else filled[f] = 'AI-generated value'
      })
      setFormData(filled)
      setAiLoading(false)
      setAiDone(true)
    }, 1500)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Forms & Documents</h2>
      <div className="grid grid-cols-3 gap-4">
        {forms.map((f:FormItem)=>(
          <div key={f.id} className="p-4 bg-white shadow rounded">
            <div className="font-bold text-gray-900">{f.name}</div>
            <div className="text-sm text-gray-600">{f.desc}</div>
            <div className="mt-2 flex justify-between items-center">
              <div className="text-xs text-gray-500">Status: {f.status}</div>
              <button onClick={()=>openForm(f)} className="px-2 py-1 bg-orange-500 text-white rounded">Open</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selected.name}</h3>
                <p className="text-sm text-gray-500">{selected.desc}</p>
              </div>
              <button onClick={()=>setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700">Fill out the fields below, or use AI to auto-fill from your deal data.</p>
                <button onClick={handleAIFill} disabled={aiLoading} className={`px-4 py-2 rounded text-sm font-medium text-white ${aiLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {aiLoading ? 'AI Filling...' : aiDone ? 'Re-run AI Fill' : 'AI Fill'}
                </button>
              </div>
              {aiDone && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">AI has filled {Object.keys(formData).length} fields from your deal data. Review and edit as needed.</div>}
              <div className="space-y-3">
                {(FORM_FIELDS[selected.id] || ['Field 1','Field 2','Field 3']).map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{field}</label>
                    <input
                      type="text"
                      value={formData[field] || ''}
                      onChange={e => setFormData({...formData, [field]: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-orange-500"
                      placeholder={`Enter ${field.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={()=>setSelected(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold">Save Form</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
