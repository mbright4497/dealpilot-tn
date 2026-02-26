'use client'
import React, {useState} from 'react'
import { createChecklistInstance, checklistProgress } from '@/lib/tc-checklist'
import ContractUpload from './ContractUpload'
type Contact = { role:string, name:string, company?:string, phone?:string, email?:string }
type Transaction = { id:number, address:string, client:string, type:string, status:string, binding?:string, closing?:string, contacts?:Contact[], notes?:string }
export default function TransactionDetail({transaction, onBack}:{transaction:Transaction,onBack:()=>void}){
  const [tab,setTab]=useState('overview')
  const [checklist,setChecklist]=useState(()=> createChecklistInstance())
  const [chatMessages,setChatMessages]=useState<any[]>([{from:'system',text:`Transaction: ${transaction.address} (${transaction.client})`}])
  const [input,setInput]=useState('')
  const contacts = transaction.contacts || []
  function send(){
    if(!input) return
    const user = {from:'user', text: input}
    setChatMessages(m=>[...m,user])
    setInput('')
    setTimeout(()=>{
      const reply = {from:'assistant', text: `Mock reply referencing ${transaction.address}. Contact: ${contacts[0]?.name || 'N/A'}`}
      setChatMessages(m=>[...m,reply])
    },600)
  }
  function quickAction(text:string){ setInput(text) }
  function daysRemaining(dateStr?:string){ if(!dateStr) return 'N/A'; const d=new Date(dateStr); const diff=Math.ceil((d.getTime()-Date.now())/(1000*60*60*24)); return diff }
  // deadlines
  const binding = transaction.binding ? new Date(transaction.binding) : null
  const closing = transaction.closing ? new Date(transaction.closing) : null
  function genDeadlines(){
    if(!binding) return []
    const add = (d:Date, days:number)=>{ const r=new Date(d); r.setDate(r.getDate()+days); return r }
    return [
      {key:'due_diligence', title:'Due Diligence Ends', date: add(binding,10)},
      {key:'inspection', title:'Inspection Contingency', date: add(binding,14)},
      {key:'appraisal', title:'Appraisal Contingency', date: add(binding,21)},
      {key:'loan_commit', title:'Loan Commitment', date: add(binding,30)},
      {key:'final_walk', title:'Final Walkthrough', date: closing? new Date(closing.getTime()-24*60*60*1000):null},
      {key:'closing', title:'Closing Date', date: closing}
    ]
  }
  const deadlines = genDeadlines()
  const TABS = ['overview','contract','contacts','checklist','forms','assistant','deadlines']
  return (
    <div className="p-6 bg-white text-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={onBack} className="text-sm text-orange-500">← Back</button>
          <h2 className="text-2xl font-bold text-gray-900">{transaction.address}</h2>
          <div className="text-sm text-gray-800 font-semibold">Client: {transaction.client} • Status: <span className={`px-2 py-1 rounded ${transaction.status==='Active'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}`}>{transaction.status}</span></div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Binding: <span className="text-gray-800 font-semibold">{transaction.binding || '—'}</span></div>
          <div className="text-sm text-gray-600">Closing: <span className="text-gray-800 font-semibold">{transaction.closing || '—'}</span></div>
        </div>
      </div>
      <div className="border-b mb-4">
        <nav className="flex gap-4">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`py-2 ${tab===t?'border-b-2 border-orange-500 text-gray-900 font-semibold':'text-gray-700'}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
        </nav>
      </div>
      <div>
        {tab==='overview' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 border rounded">
                <h3 className="text-gray-900 font-bold">Deal Summary</h3>
                <p className="text-gray-800">{transaction.notes || 'No notes yet.'}</p>
              </div>
              <div className="p-4 border rounded">
                <h3 className="text-gray-900 font-bold">Key Dates</h3>
                <ul className="text-gray-800">
                  <li>Binding: {transaction.binding || '—'}</li>
                  <li>Closing: {transaction.closing || '—'}</li>
                </ul>
              </div>
              <div className="p-4 border rounded">
                <h3 className="text-gray-900 font-bold">Checklist</h3>
                <div className="text-gray-800">Progress: {checklistProgress(checklist)}%</div>
                <div className="mt-2"><button className="px-3 py-1 bg-orange-500 text-white rounded">Open Checklist</button></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 bg-orange-500 text-white rounded">Start Task</button>
              <button className="px-3 py-2 bg-gray-100 text-gray-800 rounded">Email Title</button>
            </div>
          </div>
        )}
        {tab==='contract' && (
          <div>
            <h3 className="text-gray-900 font-bold mb-4">Contract Upload & AI Extraction</h3>
            <p className="text-sm text-gray-600 mb-4">Upload the purchase agreement or any contract document. AI will extract key fields automatically.</p>
            <ContractUpload dealId={String(transaction.id)} />
          </div>
        )}
        {tab==='contacts' && (
          <div className="grid grid-cols-3 gap-4">
            {contacts.map((c,i)=>(
              <div key={i} className="p-4 border rounded">
                <div className="text-sm text-gray-500 font-semibold">{c.role}</div>
                <div className="text-lg font-bold text-gray-900">{c.name}</div>
                <div className="text-sm text-gray-700">{c.company}</div>
                <div className="mt-3 flex gap-2">
                  <a href={`tel:${c.phone}`} className="px-2 py-1 bg-gray-100 rounded">📞 Phone</a>
                  <a href={`sms:${c.phone}`} className="px-2 py-1 bg-gray-100 rounded">💬 SMS</a>
                  <a href={`mailto:${c.email}`} className="px-2 py-1 bg-gray-100 rounded">✉ Email</a>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==='checklist' && (
          <div>
            <h3 className="text-gray-900 font-bold mb-2">Checklist</h3>
            <div className="w-full bg-gray-200 h-3 rounded mb-4"><div className="h-3 bg-orange-500 rounded" style={{width: checklistProgress(checklist)+'%'}}></div></div>
            <div className="grid gap-2">
              {checklist.map((it:any)=>(
                <div key={it.key} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-900">{it.title}</div>
                    <div className="text-sm text-gray-800">{it.updated_at}</div>
                  </div>
                  <div>
                    <input type="checkbox" checked={it.status==='done'} onChange={()=>{ it.status= it.status==='done'?'todo':'done'; setChecklist([...checklist]) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='forms' && (
          <div>
            <h3 className="text-gray-900 font-bold mb-2">Forms</h3>
            <div className="grid grid-cols-2 gap-4">
              {['RF401 Purchase Agreement','RF651 Addendum','Home Inspection Contingency','Lead Paint Disclosure','Property Condition Disclosure','Wire Fraud Advisory','Closing Disclosure Review'].map((f:any,i)=>(
                <div key={i} className="p-4 border rounded">
                  <div className="font-bold text-gray-900">{f}</div>
                  <div className="text-sm text-gray-800">Status: blank</div>
                  <div className="mt-2 flex gap-2">
                    <button className="px-2 py-1 bg-gray-100 text-gray-800 rounded">Open Form</button>
                    <button className="px-2 py-1 bg-orange-500 text-white rounded" onClick={()=>alert('AI Fill: '+f)}>AI Fill</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='assistant' && (
          <div>
            <h3 className="text-gray-900 font-bold mb-2">AI Assistant - {transaction.address}</h3>
            <div className="p-4 border rounded mb-2">
              <div className="text-sm text-gray-700">Context: {transaction.client} • {contacts.map(c=>c.role+': '+c.name).join(' • ')}</div>
            </div>
            <div className="p-3 border rounded h-64 overflow-auto mb-2">
              {chatMessages.map((m,i)=>(<div key={i} className={m.from==='assistant'? 'text-left mb-2':'text-right mb-2'}><div className="inline-block p-2 rounded bg-gray-100 text-gray-800">{m.text}</div></div>))}
            </div>
            <div className="flex gap-2">
              {['Schedule inspection with Mike Davis','Email title company about closing','Calculate days until closing'].map((c:any,i)=>(<button key={i} onClick={()=>quickAction(c)} className="px-2 py-1 bg-gray-100 text-gray-800 rounded">{c}</button>))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={input} onChange={e=>setInput(e.target.value)} className="border p-2 flex-1" />
              <button onClick={send} className="px-3 py-2 bg-orange-500 text-white rounded">Send</button>
            </div>
          </div>
        )}
        {tab==='deadlines' && (
          <div className="grid grid-cols-3 gap-4">
            {deadlines.map((d:any,i)=>{
              const days = d.date? Math.ceil((d.date.getTime()-Date.now())/(1000*60*60*24)) : null
              const color = days===null? 'bg-gray-100 text-gray-800' : days<3? 'bg-red-100 text-red-800' : days<7? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              return (
                <div key={i} className={`p-4 border rounded ${color}`}>
                  <div className="font-bold text-gray-900">{d.title}</div>
                  <div className="text-gray-800">{d.date? d.date.toLocaleDateString() : 'TBD'}</div>
                  <div className="text-sm text-gray-700">{days!==null? `${days} days` : '—'}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
