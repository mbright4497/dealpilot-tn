'use client'
import React, {useState} from 'react'

const TABS = ['Tasks','Calendar','Projects','Memories','Docs','Team','Office']

const sampleKanban = {
  Recurring: ['Daily lead follow-up','Weekly listing checks'],
  Backlog: ['Integrate GHL webhook','Prepare open house flyers'],
  'In Progress': ['Build Landing Page','Set up Ads'],
  Review: ['Contract templates','Email sequences']
}

const sampleCalendar = {
  Sun: ['Weekly review (Recurring)'], Mon: ['Client meeting 10am'], Tue: ['Showing 2pm'], Wed: ['Pipeline cleanup (Recurring)'], Thu: ['Advertising review'], Fri: ['Contract signing'], Sat: ['Open house']
}

const sampleProjects = [
  {title:'HubLinkPro Landing', progress:70},
  {title:'ClosingPilot Integration', progress:45},
  {title:'GHL Automation', progress:30}
]

const sampleMemories = [
  {date:'2026-03-20', text:'Closed deal with Smith family'},
  {date:'2026-03-18', text:'Deployed GHL webhook'},
  {date:'2026-02-28', text:'Onboarded new agent: Nina'}
]

const sampleDocs = [
  {name:'Listing Checklist.pdf', size:'120KB'},
  {name:'Buyer FAQ.md', size:'15KB'},
  {name:'Contract Template.docx', size:'45KB'}
]

const TEAM = [
  { name: 'Marcus', role: 'COO' },
  { name: 'Dev', role: 'Software Engineer' },
  { name: 'Reva', role: 'Transaction Coordinator' },
  { name: 'Carlos', role: 'Lead Gen & CRM Manager' },
  { name: 'Nina', role: 'Content & Marketing Director' },
  { name: 'Maya', role: 'Client Success & Booking' },
]

export default function MissionControl(){
  const [tab, setTab] = useState<string>('Tasks')

  return (
    <div style={{minHeight:'100vh'}} className="bg-[#0f172a] text-white flex">
      {/* Sidebar */}
      <aside style={{width:200}} className="border-r border-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-4">Mission Control</h2>
        <nav className="flex flex-col gap-2">
          {TABS.map(t=> (
            <button key={t}
              onClick={()=>setTab(t)}
              className={`text-left px-3 py-2 rounded ${tab===t? 'bg-gray-700':'hover:bg-gray-800'}`}>
              {t}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <main className="flex-1 p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{tab}</h1>
          <p className="text-gray-400">Overview of {String(tab).toLowerCase()}</p>
        </header>

        <section>
          {tab === 'Tasks' && <div className="p-4"><h2 className="text-lg font-semibold mb-2">Tasks</h2><p className="text-slate-400">Loading tasks...</p></div>}
          {tab === 'Calendar' && <div className="p-4"><h2 className="text-lg font-semibold mb-2">Calendar</h2><p className="text-slate-400">No events scheduled.</p></div>}
          {tab === 'Projects' && <div className="p-4"><h2 className="text-lg font-semibold mb-2">Projects</h2><p className="text-slate-400">No projects yet.</p></div>}
          {tab === 'Memories' && <div className="p-4"><h2 className="text-lg font-semibold mb-2">Memories</h2><p className="text-slate-400">No memories yet.</p></div>}
          {tab === 'Docs' && <div className="p-4"><h2 className="text-lg font-semibold mb-2">Docs</h2><p className="text-slate-400">No docs yet.</p></div>}
          {tab === 'Team' && <div className="p-4"><h2 className="text-lg font-semibold mb-2">Team</h2><p className="text-slate-400">Team view coming soon.</p></div>}
          {tab === 'Office' && <div className="p-4"><h2 className="text-lg font-semibold mb-2">Office</h2><p className="text-slate-400">Office coming soon.</p></div>}
        </section>
      </main>
    </div>
  )
}

