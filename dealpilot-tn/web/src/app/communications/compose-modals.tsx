'use client'
import React, {useState} from 'react'
export function ComposeModals(){
  const [show,setShow]=useState(false)
  const [type,setType]=useState<'sms'|'email'|'call'>('sms')
  const templates = ['Inspection Reminder','Earnest Money Due','Closing Scheduled','Document Request','General Update']
  return (
    <div>
      <button onClick={()=>setShow(true)} className="fixed bottom-24 right-6 bg-orange-500 text-black w-14 h-14 rounded-full shadow-lg">+</button>
      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#0f223a] p-4 rounded w-96">
            <div className="flex gap-2 mb-3">
              <button onClick={()=>setType('sms')} className={`px-3 py-1 rounded ${type==='sms'?'bg-gray-700':'bg-gray-800'}`}>SMS</button>
              <button onClick={()=>setType('email')} className={`px-3 py-1 rounded ${type==='email'?'bg-gray-700':'bg-gray-800'}`}>Email</button>
              <button onClick={()=>setType('call')} className={`px-3 py-1 rounded ${type==='call'?'bg-gray-700':'bg-gray-800'}`}>Call</button>
            </div>
            {type==='sms' && (
              <div>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  <option>Contact A</option>
                </select>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  {templates.map(t=> <option key={t}>{t}</option>)}
                </select>
                <textarea className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded" rows={4} defaultValue={'Template message here with {{deal.address}}'} />
                <div className="mt-3 text-right"><button onClick={()=>{alert('Sent (UI only)'); setShow(false)}} className="bg-orange-500 text-black px-3 py-1 rounded">Send</button></div>
              </div>
            )}
            {type==='email' && (
              <div>
                <input className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2" placeholder="To" />
                <input className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2" placeholder="Subject" />
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  {templates.map(t=> <option key={t}>{t}</option>)}
                </select>
                <div className="bg-[#081224] p-2 border border-gray-800 rounded mb-2">Rich text body (UI only)</div>
                <div className="mt-3 text-right"><button onClick={()=>{alert('Email queued (UI only)'); setShow(false)}} className="bg-orange-500 text-black px-3 py-1 rounded">Send</button></div>
              </div>
            )}
            {type==='call' && (
              <div>
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  <option>Contact A</option>
                </select>
                <input className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2" placeholder="Duration" />
                <select className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded mb-2">
                  <option>Incoming</option>
                  <option>Outgoing</option>
                </select>
                <textarea className="w-full bg-[#0f223a] p-2 border border-gray-700 rounded" rows={3} placeholder="Notes" />
                <div className="mt-3 text-right"><button onClick={()=>{alert('Call logged (UI only)'); setShow(false)}} className="bg-orange-500 text-black px-3 py-1 rounded">Save</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
