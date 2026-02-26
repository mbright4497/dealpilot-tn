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
  const [localContacts,setLocalContacts]=useState<Contact[]>(transaction.contacts || [])
  const [showAddContact,setShowAddContact]=useState(false)
  const [newContact,setNewContact]=useState<Contact>({role:'',name:'',company:'',phone:'',email:''})
  function addContact(){
    if(!newContact.name||!newContact.role) return
    setLocalContacts(prev=>[...prev,{...newContact}])
    setNewContact({role:'',name:'',company:'',phone:'',email:''})
    setShowAddContact(false)
  }
  function removeContact(idx:number){ setLocalContacts(prev=>prev.filter((_,i)=>i!==idx)) }
  function send(){
    if(!input) return
    const user = {from:'user', text: input}
    setChatMessages(m=>[...m,user])
    setInput('')
    setTimeout(()=>{
      const reply = {from:'assistant', text: `Mock reply referencing ${transaction.address}. Contact: ${localContacts[0]?.name || 'N/A'}`}
      setChatMessages(m=>[...m,reply])
    },600)
  }
  function quickAction(text:string){ setInput(text) }
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
      {key:'final_walk', title:'Final Walkthrough', date: closing? new Date(closing.getTime()-86400000):null},
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-bold">Contacts</h3>
              <button onClick={()=>setShowAddContact(!showAddContact)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                {showAddContact ? 'Cancel' : '+ Add Contact'}
              </button>
            </div>
            {showAddContact && (
              <div className="p-4 border-2 border-orange-200 rounded-lg mb-4 bg-orange-50">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
                    <select value={newContact.role} onChange={e=>setNewContact({...newContact,role:e.target.value})} className="w-full border rounded p-2 text-sm">
                      <option value="">Select role...</option>
                      <option>Buyer Agent</option><option>Listing Agent</option><option>Lender</option>
                      <option>Title Company</option><option>Inspector</option><option>Appraiser</option>
                      <option>Attorney</option><option>Buyer</option><option>Seller</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                    <input value={newContact.name} onChange={e=>setNewContact({...newContact,name:e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Company</label>
                    <input value={newContact.company||''} onChange={e=>setNewContact({...newContact,company:e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="Company name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input value={newContact.phone||''} onChange={e=>setNewContact({...newContact,phone:e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="(423) 555-0000" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                    <input value={newContact.email||''} onChange={e=>setNewContact({...newContact,email:e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="email@example.com" />
                  </div>
                </div>
                <button onClick={addContact} className="px-4 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600">Save Contact</button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              {localContacts.map((c,i)=>(
                <div key={i} className="p-4 border rounded relative group">
                  <button onClick={()=>removeContact(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg" title="Remove contact">×</button>
                  <div className="text-sm text-gray-500 font-semibold">{c.role}</div>
                  <div className="text-lg font-bold text-gray-900">{c.name}</div>
                  <div className="text-sm text-gray-700">{c.company}</div>
                  <div className="mt-3 flex gap-2">
                    <a href={`tel:${c.phone}`} className="px-2 py-1 bg-gray-100 rounded text-sm">Phone</a>
                    <a href={`sms:${c.phone}`} className="px-2 py-1 bg-gray-100 rounded text-sm">SMS</a>
                    <a href={`mailto:${c.email}`} className="px-2 py-1 bg-gray-100 rounded text-sm">Email</a>
                  </div>
                </div>
              ))}
            </div>
            {localContacts.length===0 && <p className="text-gray-500 text-center py-8">No contacts yet. Click "+ Add Contact" to get started.</p>}
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
              <div className="text-sm text-gray-700">Context: {transaction.client} • {localContacts.map(c=>c.role+': '+c.name).join(' • ')}</div>
            </div>
            <div className="p-3 border rounded h-64 overflow-auto mb-2">
              {chatMessages.map((m,i)=>(<div key={i} className={m.from==='assistant'? 'text-left mb-2':'text-right mb-2'}><div className="inline-block p-2 rounded bg-gray-100 text-gray-800">{m.text}</div></div>))}
            </div>
            <div className="flex gap-2">
              {['Schedule inspection','Email title company','Calculate days until closing'].map((c:any,i)=>(<button key={i} onClick={()=>quickAction(c)} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{c}</button>))}
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
