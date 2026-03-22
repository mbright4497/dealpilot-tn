"use client";
import React, { useState } from "react";

// Constants
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = [8,7,6,5,4,3,2,1];

// Sample data
const sampleKanban = {
  Recurring: ["Daily lead follow-up","Weekly listing checks"],
  Backlog: ["Integrate GHL webhook","Prepare open house flyers"],
  "In Progress": ["Build Landing Page","Set up Ads"],
  Review: ["Contract templates","Email sequences"]
};

const sampleCalendar:any = {
  Sun: ["Weekly review (Recurring)"],
  Mon: ["Client meeting 10am"],
  Tue: ["Showing 2pm"],
  Wed: ["Pipeline cleanup (Recurring)"],
  Thu: ["Advertising review"],
  Fri: ["Contract signing"],
  Sat: ["Open house"]
};

const sampleProjects = [
  { title: 'HubLinkPro Landing', progress: 70 },
  { title: 'ClosingPilot Integration', progress: 45 },
  { title: 'GHL Automation', progress: 30 }
];

const sampleMemories = [
  { date: '2026-03-20', text: 'Closed deal with Smith family' },
  { date: '2026-03-18', text: 'Deployed GHL webhook' },
  { date: '2026-02-28', text: 'Onboarded new agent: Nina' }
];

const TEAM = [
  { name: 'Tango', role: 'Leader / Orchestrator', status: 'active' },
  { name: 'Marcus', role: 'COO', status: 'active' },
  { name: 'Rayno', role: 'Software Engineer', status: 'idle' },
  { name: 'Reva', role: 'Transaction Coordinator', status: 'offline' },
  { name: 'Carlos', role: 'Lead Gen & CRM Manager', status: 'idle' },
  { name: 'Nina', role: 'Content & Marketing Director', status: 'active' },
  { name: 'Maya', role: 'Client Success & Booking', status: 'active' }
];

const AGENT_ORDER = [
  { name: 'Tango', piece: '\u2654', coord: 'e1' },
  { name: 'Marcus', piece: '\u2655', coord: 'd1' },
  { name: 'Rayno', piece: '\u2657', coord: 'f1' },
  { name: 'Reva', piece: '\u2656', coord: 'a1' },
  { name: 'Carlos', piece: '\u2658', coord: 'b1' },
  { name: 'Nina', piece: '\u2659', coord: 'd2' },
  { name: 'Maya', piece: '\u2659', coord: 'e2' }
];

// Helpers
const fmtTime = (s?: any) => s ? String(s) : '';
const relativeTime = (iso?: any) => iso ? String(iso) : '-';

export default function MissionControlPage(){
  const [tab, setTab] = useState<string>('Overview');

  // Defensive get agent by name
  const findAgent = (name:string) => (Array.isArray(TEAM)?TEAM:[]).find(a=>a.name===name) || null;
  const getAgentAt = (coord:string) => {
    const map:any = Object.fromEntries(AGENT_ORDER.map((a:any)=>[a.coord,a.name]));
    const name = map[coord]; if(!name) return null; return { name, ...(findAgent(name) || {}), piece: AGENT_ORDER.find((x:any)=>x.name===name)?.piece };
  }

  // Safe render helpers
  const safeArray = (v:any) => Array.isArray(v) ? v : [];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="text-amber-400 font-bold text-2xl">Mission Control</div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-amber-600 rounded text-black">Tango Online</div>
          <div className="text-sm text-gray-200">{safeArray(TEAM).filter(a=>a.status==='active').length}/7 active</div>
        </div>
      </header>

      <div className="flex gap-6">
        {/* Sidebar with amber accent */}
        <aside className="w-48">
          <nav className="space-y-1">
            {['Overview','Tasks','Calendar','Projects','Memories','Office','Chat'].map(t=> (
              <button key={t} onClick={()=>setTab(t)} className={`w-full text-left px-3 py-2 rounded ${tab===t? 'border-l-4 border-amber-500 bg-slate-800':'hover:bg-slate-800'}`}>
                {t}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          {/* Overview - chessboard (kept exact style/behavior) */}
          {tab==='Overview' && (
            <section>
              <h2 className="text-xl font-bold text-amber-300 mb-3">The Board</h2>
              <div className="mb-3 text-sm text-gray-300">An 8x8 view of agent positions and status</div>
              <div className="border-4 border-amber-800 rounded shadow-2xl inline-block">
                <div className="grid grid-cols-8" style={{width:72*8}}>
                  {RANKS.map(rank => FILES.map((file,i)=>{
                    const coord = `${file}${rank}`;
                    const light = ((rank + i) % 2 === 0);
                    const bg = light ? 'bg-amber-100' : 'bg-amber-900';
                    const agent = getAgentAt(coord);
                    return (
                      <div key={coord} className={`${bg} p-0`} style={{width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                        {agent ? (
                          <div className="flex flex-col items-center justify-center w-full h-full">
                            <div className="text-4xl text-white" style={{textShadow:'0 2px 6px rgba(0,0,0,0.6)'}}>{agent.piece}</div>
                            <div className="text-xs font-bold text-white mt-1" style={{textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>{agent.name}</div>
                            <span className={`absolute top-1 right-1 w-3 h-3 rounded-full ${agent?.status==='active'?'bg-green-500':agent?.status==='idle'?'bg-yellow-400':'bg-gray-400'}`}></span>
                          </div>
                        ) : null}
                      </div>
                    )
                  }))}
                </div>
                <div className="flex mt-2 justify-between px-1 text-amber-800">
                  {FILES.map(f=> <div key={f} style={{width:72,textAlign:'center'}}>{f}</div>)}
                </div>
              </div>
            </section>
          )}

          {/* Tasks tab - use safe sampleKanban */}
          {tab==='Tasks' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Tasks</h2>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(sampleKanban).map(([col,items]) => (
                  <div key={col} className="bg-slate-800 p-3 rounded border border-slate-700">
                    <h3 className="font-semibold mb-2">{col}</h3>
                    <ul className="space-y-2">
                      {safeArray(items).map((it:any,idx:number)=> <li key={idx} className="bg-slate-900 p-2 rounded">{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Calendar tab - static days lookup (no Object.entries) */}
          {tab==='Calendar' && (
            <section className="p-4">
              <h2 className="text-xl font-bold text-amber-400 mb-4">Calendar</h2>
              <div className="space-y-3">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                  <div key={day} className="bg-slate-800 rounded p-3">
                    <span className="text-amber-400 font-semibold">{day}</span>
                    <span className="text-slate-400 ml-3 text-sm">{safeArray((sampleCalendar as any)[day]).length ? safeArray((sampleCalendar as any)[day]).join(', ') : 'No events'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects tab */}
          {tab==='Projects' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Projects</h2>
              <div className="space-y-4">
                {safeArray(sampleProjects).map((p:any,idx:number)=> (
                  <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p?.title}</div>
                        <div className="text-sm text-gray-400">Progress</div>
                      </div>
                      <div className="w-1/3">
                        <div className="bg-gray-900 h-3 rounded overflow-hidden">
                          <div style={{width: `${Number(p?.progress||0)}%`}} className="bg-green-600 h-3"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Memories tab */}
          {tab==='Memories' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Memories</h2>
              <div className="space-y-2">
                {safeArray(sampleMemories).slice().sort((a:any,b:any)=> b.date.localeCompare(a.date)).map((m:any,idx:number)=> (
                  <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="text-xs text-gray-400">{m?.date}</div>
                    <div className="mt-1">{m?.text}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Office tab */}
          {tab==='Office' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Office</h2>
              <div className="grid grid-cols-8 gap-2">
                {Array.from({length: 6*8}).map((_,i)=> (
                  <div key={i} className="p-3 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
                    <span className={`w-3 h-3 rounded-full ${['bg-green-500','bg-yellow-400','bg-red-500','bg-gray-600'][i%4]}`}></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Chat tab */}
          {tab==='Chat' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Chat</h2>
              <p className="text-slate-400">Chat coming soon.</p>
            </section>
          )}

        </section>
      </main>
    </div>
  )
}
