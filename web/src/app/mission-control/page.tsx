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
  const [active, setActive] = useState<string>('Tasks')

  return (
    <div style={{minHeight:'100vh'}} className="bg-gray-50 text-gray-900 flex">
      {/* Sidebar */}
      <aside style={{width:200}} className="border-r border-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-4">Mission Control</h2>
        <nav className="flex flex-col gap-2">
          {TABS.map(tab=> (
            <button key={tab}
              onClick={()=>setActive(tab)}
              className={`text-left px-3 py-2 rounded ${active===tab? 'bg-gray-700':'hover:bg-gray-800'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <main className="flex-1 p-6 bg-white text-gray-900">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{active}</h1>
          <p className="text-gray-400">Overview of {active.toLowerCase()}</p>
        </header>

        <section>
          {active==='Tasks' && <KanbanBoard />}
          {active==='Calendar' && <WeeklyCalendar />}
          {active==='Projects' && <ProjectsView />}
          {active==='Memories' && <MemoriesView />}
          {active==='Docs' && <DocsView />}
          {active==='Team' && <TeamView />}
          {active==='Office' && <OfficeView />}
        </section>
      </main>
    </div>
  )
}

function KanbanBoard(){
  return (
    <div className="grid grid-cols-4 gap-4">
      {Object.entries(sampleKanban).map(([col,items])=> (
        <div key={col} className="bg-white p-4 rounded border border-gray-800">
          <h3 className="font-semibold mb-2">{col}</h3>
          <ul className="space-y-2">
            {items.map((it:any,idx:number)=> (
              <li key={idx} className="bg-gray-900 p-2 rounded">{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function WeeklyCalendar(){
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(d=> (
        <div key={d} className="p-3 bg-white rounded border border-gray-800 min-h-[120px]">
          <div className="font-semibold mb-2">{d}</div>
          <ul className="text-sm text-gray-300 space-y-1">
            {(sampleCalendar as any)[d]?.map((ev:string, i:number)=>(<li key={i} className="px-2 py-1 bg-gray-900 rounded">{ev}</li>))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ProjectsView(){
  return (
    <div className="space-y-4">
      {sampleProjects.map((p,idx)=> (
        <div key={idx} className="bg-white p-4 rounded border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">{p.title}</h4>
              <p className="text-sm text-gray-400">Progress</p>
            </div>
            <div className="w-1/3">
              <div className="bg-gray-900 h-3 rounded overflow-hidden">
                <div style={{width:`${p.progress}%`}} className="bg-green-600 h-3"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MemoriesView(){
  const sorted = [...sampleMemories].sort((a,b)=> b.date.localeCompare(a.date))
  return (
    <div className="space-y-2">
      {sorted.map((m,idx)=>(
        <div key={idx} className="bg-white p-3 rounded border border-gray-800">
          <div className="text-sm text-gray-400">{m.date}</div>
          <div className="mt-1">{m.text}</div>
        </div>
      ))}
    </div>
  )
}

function DocsView(){
  return (
    <div className="space-y-2">
      {sampleDocs.map((d,idx)=>(
        <div key={idx} className="bg-white p-3 rounded border border-gray-800 flex justify-between">
          <div>
            <div className="font-medium">{d.name}</div>
            <div className="text-sm text-gray-400">{d.size}</div>
          </div>
          <div className="text-sm text-gray-400">PDF</div>
        </div>
      ))}
    </div>
  )
}

function TeamView(){
  return (
    <div className="grid grid-cols-3 gap-4">
      {TEAM.map((t,idx)=> (
        <div key={idx} className="bg-white p-3 rounded border border-gray-800 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold">{t.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
          <div className="mt-2 font-medium">{t.name}</div>
          <div className="text-sm text-gray-400">{t.role}</div>
        </div>
      ))}
    </div>
  )
}

function OfficeView(){
  // simple 8x6 grid with colored dots
  const rows = 6, cols = 8
  const colors = ['bg-green-500','bg-yellow-400','bg-red-500','bg-gray-600']
  return (
    <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${cols}, 1fr)`}}>
      {Array.from({length:rows*cols}).map((_,i)=> (
        <div key={i} className="p-3 bg-white rounded flex items-center justify-center border border-gray-800">
          <span className={`w-3 h-3 rounded-full ${colors[i%colors.length]}`}></span>
        </div>
      ))}
    </div>
  )
}
