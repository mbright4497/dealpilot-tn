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

const AGENT_ORDER = [
  { name: 'Tango', role: 'Leader / Orchestrator', piece: '\u2654', coord: 'e1' },
  { name: 'Marcus', role: 'COO', piece: '\u2655', coord: 'd1' },
  { name: 'Rayno', role: 'Software Engineer', piece: '\u2657', coord: 'f1' },
  { name: 'Reva', role: 'Transaction Coordinator', piece: '\u2656', coord: 'a1' },
  { name: 'Carlos', role: 'Lead Gen & CRM Manager', piece: '\u2658', coord: 'b1' },
  { name: 'Nina', role: 'Content & Marketing Director', piece: '\u2659', coord: 'd2' },
  { name: 'Maya', role: 'Client Success & Booking', piece: '\u2659', coord: 'e2' }
]

export default function MissionControl(){
  const [tab, setTab] = useState<string>('Overview')

  // helper
  const findAgent = (name:string) => (Array.isArray(TEAM)?TEAM:[]).find(a=>a.name===name) || null

  const getAgentAt = (coord:string)=>{
    const placement:any = Object.fromEntries(AGENT_ORDER.map(a=>[a.coord, a.name]));
    const name = placement[coord];
    if(!name) return null;
    const agent = findAgent(name);
    return { name, ...agent, piece: AGENT_ORDER.find(a=>a.name===name)?.piece }
  }

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
          {tab === 'Overview' && (
            <div>
              <h2 className="text-xl font-bold text-amber-300 mb-3">The Board</h2>
              <div className="mb-3 text-sm text-gray-300">An 8x8 view of agent positions and status</div>
              <div className="border-4 border-amber-800 rounded shadow-2xl inline-block">
                <div className="grid grid-cols-8" style={{width:72*8}}>
                  {RANKS.map(rank=> (
                    FILES.map((file,i)=>{
                      const coord = `${file}${rank}`;
                      const light = ((rank + i) %2 ===0);
                      const bg = light ? 'bg-amber-100' : 'bg-amber-900';
                      const agent = getAgentAt(coord);
                      return (
                        <div key={coord} className={`${bg} p-0`} style={{width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                          {agent ? (
                            <button onClick={()=>setTab('Overview')} className="flex flex-col items-center justify-center w-full h-full" title={`${agent.name} - ${agent.role}`}>
                              <div className="text-4xl text-white" style={{textShadow:'0 2px 6px rgba(0,0,0,0.6)'}}>{agent.piece}</div>
                              <div className="text-xs font-bold text-white mt-1" style={{textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>{agent.name}</div>
                              <span className={`absolute top-1 right-1 w-3 h-3 rounded-full ${agent?.status==='working'?'bg-green-500':agent?.status==='idle'?'bg-yellow-400':'bg-gray-400'}`}></span>
                            </button>
                          ) : null}
                        </div>
                      )
                    })
                  ))}
                </div>
                <div className="flex mt-2 justify-between px-1 text-amber-800">
                  {FILES.map(f=> <div key={f} style={{width:72,textAlign:'center'}}>{f}</div>)}
                </div>
              </div>
            </div>
          )}
          {tab === 'Tasks' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Tasks</h2>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(sampleKanban).map(([col,items])=> (
                  <div key={col} className="bg-[#071033] p-4 rounded border border-gray-800">
                    <h3 className="font-semibold mb-2">{col}</h3>
                    <ul className="space-y-2">
                      {(items as any[]).map((it:any,idx:number)=> (
                        <li key={idx} className="bg-gray-900 p-2 rounded">{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Calendar' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Calendar</h2>
              <div className="grid grid-cols-7 gap-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> (
                  <div key={d} className="p-3 bg-[#071033] rounded border border-gray-800 min-h-[120px]">
                    <div className="font-semibold mb-2">{d}</div>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {((sampleCalendar as any)[d]||[]).map((ev:string,i:number)=>(<li key={i} className="px-2 py-1 bg-gray-900 rounded">{ev}</li>))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Projects' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Projects</h2>
              <div className="space-y-4">
                {(sampleProjects||[]).map((p:any,idx:number)=> (
                  <div key={idx} className="bg-[#071033] p-4 rounded border border-gray-800">
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
            </div>
          )}

          {tab === 'Memories' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Memories</h2>
              <div className="space-y-2">
                {([...(sampleMemories||[])].sort((a:any,b:any)=>b.date.localeCompare(a.date))).map((m:any,idx:number)=> (
                  <div key={idx} className="bg-[#071033] p-3 rounded border border-gray-800">
                    <div className="text-sm text-gray-400">{m.date}</div>
                    <div className="mt-1">{m.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Docs' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Docs</h2>
              <div className="space-y-2">
                {(sampleDocs||[]).map((d:any,idx:number)=> (
                  <div key={idx} className="bg-[#071033] p-3 rounded border border-gray-800 flex justify-between">
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-sm text-gray-400">{d.size}</div>
                    </div>
                    <div className="text-sm text-gray-400">PDF</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Team' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Team</h2>
              <div className="grid grid-cols-3 gap-4">
                {(TEAM||[]).map((t:any,idx:number)=> (
                  <div key={idx} className="bg-[#071033] p-3 rounded border border-gray-800 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold">{(t.name||'').split(' ').map((s:any)=>s[0]).slice(0,2).join('')}</div>
                    <div className="mt-2 font-medium">{t.name}</div>
                    <div className="text-sm text-gray-400">{t.role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Office' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Office</h2>
              <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${8}, 1fr)`}}>
                {Array.from({length:6*8}).map((_,i)=> (
                  <div key={i} className="p-3 bg-[#071033] rounded flex items-center justify-center border border-gray-800">
                    <span className={`w-3 h-3 rounded-full ${['bg-green-500','bg-yellow-400','bg-red-500','bg-gray-600'][i%4]}`}></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

