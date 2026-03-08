'use client'
import React
import {useRouter} from "next/navigation"
, {useState} from 'react'
import ComposeModals from './compose-modals'

function Avatar({name,unread}:{name:string,unread?:number}){
  const router = useRouter()
  const initials=name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()
  const bg='linear-gradient(135deg,#f97316,#fb923c)'
  return <div className="flex items-center gap-3">
    <div style={{background:bg}} className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold">{initials}</div>
    <div className="flex flex-col">
      <div className="text-sm font-medium">{name}</div>
      <div className="text-xs text-gray-400">Last message preview…</div>
    </div>
    {unread? <div className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded">{unread}</div>:null}
  </div>
}

export default function Communications(){
  const router = useRouter()

  const [tab,setTab]=useState<'messages'|'email'|'calls'>('messages')
  const [selected,setSelected]=useState<string|null>('John Doe')
  const contacts=[{name:'John Doe',unread:2},{name:'Builder Rep'},{name:'Lender Sam'}]
  return (
    <div className="min-h-screen bg-[#061021] text-gray-100 p-6">
      <div className="mb-3"><button onClick={()=>router.back()} className="text-slate-400 hover:text-orange-400 flex items-center gap-2">← Back</button></div>
<header className="mb-4">
        <h1 className="text-3xl font-bold">Communications</h1>
        <p className="text-sm text-gray-400">Manage all deal conversations</p>
      </header>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <input className="flex-1 bg-[#0f223a] px-3 py-2 rounded" placeholder="Search contacts" />
            <button className="bg-gray-700 px-3 py-2 rounded">🔍</button>
          </div>

          <div className="space-y-2 overflow-auto max-h-[60vh]">
            {contacts.map(c=> (
              <button key={c.name} onClick={()=>setSelected(c.name)} className="w-full text-left p-3 bg-[#0f223a] rounded hover:shadow">
                <Avatar name={c.name} unread={c.unread} />
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex flex-col">
          <div className="border-b border-gray-700 pb-2 mb-3">
            <nav className="flex gap-6">
              {['messages','email','calls'].map(t=> (
                <button key={t} onClick={()=>setTab(t as any)} className={`pb-2 ${tab===t? 'border-b-2 border-[#f97316]':''}`}>{t.toUpperCase()}</button>
              ))}
            </nav>
          </div>

          {tab==='messages' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 bg-[#0f223a] p-3 rounded space-y-3">
                <div className="text-sm text-gray-300">{selected}</div>
                <div className="space-y-3">
                  <div className="max-w-[60%] ml-auto bg-[#f9731610] text-black px-3 py-2 rounded-lg relative">Sent message<div className="text-xs text-gray-400 mt-1">2m • ✓</div></div>
                  <div className="max-w-[70%] bg-[#0f223a] text-gray-100 px-3 py-2 rounded-lg">Received message<div className="text-xs text-gray-400 mt-1">5m</div></div>
                  <div className="text-xs text-gray-500 italic">Typing…</div>
                </div>
                <div className="mt-3 flex gap-2"><input className="flex-1 bg-[#1a1a2e] px-3 py-2 rounded" placeholder="Type a message" /><button className="bg-orange-500 px-3 py-2 rounded text-black">Send</button></div>
              </div>

              <div className="col-span-1 bg-[#0f223a] p-3 rounded">
                <div className="text-center text-gray-400">Conversation details & deal badge</div>
              </div>
            </div>
          )}

          {tab==='email' && (
            <div className="bg-[#0f223a] p-3 rounded h-80 overflow-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#0f223a] rounded hover:shadow">
                  <div><div className="font-medium">Lender@bank.com</div><div className="text-xs text-gray-400">Inspection reminder subject preview…</div></div>
                  <div className="text-xs text-gray-400">2h</div>
                </div>
              </div>
            </div>
          )}

          {tab==='calls' && (
            <div className="bg-[#0f223a] p-3 rounded h-80 overflow-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#0f223a] rounded hover:shadow">
                  <div><div className="font-medium">John Doe</div><div className="text-xs text-gray-400">Outgoing • 00:02:34</div></div>
                  <div className="text-xs text-gray-400">Mar 8</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ComposeModals />
    </div>
  )
}