'use client'
import React, {useState} from 'react'
export default function SettingsPage(){
  const [tab,setTab]=useState('profile')
  return (
    <div className="p-6 bg-[#061021] min-h-screen text-gray-200">
      <header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">⚙️ Settings</h1>
        <p className="text-sm text-gray-400">Manage your ClosingPilot TN account</p>
      </header>
      <div className="mb-4 flex gap-2">
        {['profile','notifications','integrations','billing'].map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-t-lg ${tab===t? 'bg-gray-800 text-orange-400':'bg-gray-700 text-gray-300'}`}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-b-lg p-6">
        {tab==='profile' && (
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input className="bg-[#0f223a] border border-gray-700 text-white p-3 rounded" placeholder="Name" />
              <input className="bg-[#0f223a] border border-gray-700 text-white p-3 rounded" placeholder="Email" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <input className="bg-[#0f223a] border border-gray-700 text-white p-3 rounded" placeholder="Phone" />
              <input className="bg-[#0f223a] border border-gray-700 text-white p-3 rounded" placeholder="Brokerage" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <input className="bg-[#0f223a] border border-gray-700 text-white p-3 rounded" placeholder="License Number" />
              <div />
            </div>
            <div className="text-right">
              <button className="bg-orange-500 text-black px-4 py-2 rounded">Save</button>
            </div>
          </div>
        )}
        {tab==='notifications' && (
          <div className="grid gap-4">
            {['Email Alerts','Deadline Reminders','EVA Daily Briefing','SMS Notifications'].map((label)=> (
              <div key={label} className="flex items-center justify-between bg-[#0f223a] border border-gray-700 p-3 rounded">
                <div className="text-gray-200">{label}</div>
                <input type="checkbox" />
              </div>
            ))}
          </div>
        )}
        {tab==='integrations' && (
          <div className="grid gap-4">
            <div className="bg-[#0f223a] border border-gray-700 p-4 rounded">
              <div className="text-sm text-gray-300">GHL Connection</div>
              <div className="mt-2 grid md:grid-cols-2 gap-2">
                <input className="bg-[#0f223a] border border-gray-700 text-white p-2 rounded" placeholder="Location ID" />
                <input className="bg-[#0f223a] border border-gray-700 text-white p-2 rounded" placeholder="API Key" />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="bg-gray-700 text-gray-200 px-3 py-1 rounded">Test</button>
                <button className="bg-orange-500 text-black px-3 py-1 rounded">Save</button>
              </div>
            </div>
            <div className="bg-[#0f223a] border border-gray-700 p-4 rounded text-gray-300">Twilio — Coming Soon</div>
            <div className="bg-[#0f223a] border border-gray-700 p-4 rounded text-gray-300">Resend — Coming Soon</div>
          </div>
        )}
        {tab==='billing' && (
          <div className="grid gap-4">
            <div className="bg-[#0f223a] border border-gray-700 p-4 rounded">
              <div className="text-sm text-gray-300">Current Plan</div>
              <div className="text-white font-medium">Free Trial</div>
              <div className="mt-3">
                <a href="/pricing" className="text-orange-400">Upgrade</a>
              </div>
            </div>
            <div className="bg-[#0f223a] border border-gray-700 p-4 rounded text-gray-300">Usage stats — placeholder</div>
          </div>
        )}
      </div>
    </div>
  )
}
