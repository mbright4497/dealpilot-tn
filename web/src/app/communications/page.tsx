'use client'
import React, {useState} from 'react'
export default function CommunicationsPage(){
  const [tab,setTab]=useState('messages')
  return (
    <div className="p-6 bg-[#061021] min-h-screen text-gray-100">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Communications</h1>
        <p className="text-sm text-gray-300">Manage all deal conversations</p>
      </header>
      <div className="mb-4 flex gap-2">
        {['messages','email','calls'].map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-t-lg ${tab===t? 'bg-gray-800 text-orange-400':'bg-gray-700 text-gray-300'}`}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-b-lg p-4 grid grid-cols-3 gap-4">
        {tab==='messages' && (
          <>
            <div className="col-span-1 bg-[#0f223a] border border-white/10 rounded p-3">
              <div className="space-y-2">
                <div className="p-2 rounded bg-gray-700 text-sm">John Doe — 45 Oak Ln <div className="text-xs text-gray-400">Hey — can we tour?</div></div>
                <div className="p-2 rounded bg-gray-700 text-sm">Builder Rep — New Homes <div className="text-xs text-gray-400">Model open Sat</div></div>
              </div>
            </div>
            <div className="col-span-2 bg-[#0f223a] border border-white/10 rounded p-3 flex flex-col">
              <div className="flex-1 overflow-auto">
                <div className="space-y-3">
                  <div className="text-sm"><span className="font-semibold">You:</span> Sounds good — I'll schedule.</div>
                  <div className="text-sm"><span className="font-semibold">John:</span> Thanks — can we do 5pm?</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <input className="flex-1 bg-[#0f223a] border border-gray-700 p-2 rounded" placeholder="Type a message" />
                <button className="bg-orange-500 text-black px-4 py-2 rounded">Send</button>
              </div>
            </div>
          </>
        )}
        {tab==='email' && (
          <>
            <div className="col-span-1 bg-[#0f223a] border border-white/10 rounded p-3">
              <div className="space-y-2">
                <div className="p-2 rounded bg-gray-700 text-sm">Inspection Reminder — Lender@bank.com</div>
                <div className="p-2 rounded bg-gray-700 text-sm">Offer Accepted — Seller@listings.com</div>
              </div>
            </div>
            <div className="col-span-2 bg-[#0f223a] border border-white/10 rounded p-3">
              <h3 className="font-semibold">Inspection Reminder</h3>
              <p className="text-sm text-gray-300">Hi John, this is a reminder that your inspection is scheduled...</p>
              <div className="mt-3">
                <button className="bg-orange-500 text-black px-3 py-1 rounded">Reply</button>
              </div>
            </div>
          </>
        )}
        {tab==='calls' && (
          <div className="col-span-3 grid grid-cols-1 gap-3">
            <div className="bg-[#0f223a] border border-white/10 p-3 rounded">Called John — 00:02:34 — Incoming — 2026-03-07</div>
            <div className="bg-[#0f223a] border border-white/10 p-3 rounded">Called Builder — 00:04:12 — Outgoing — 2026-03-06</div>
          </div>
        )}
      </div>
      <button className="fixed bottom-6 right-6 bg-orange-500 text-black w-14 h-14 rounded-full shadow-lg">+</button>
    </div>
  )
}
