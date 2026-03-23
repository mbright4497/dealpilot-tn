"use client";
import React, { useEffect, useState } from "react";

// Constants
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = [8,7,6,5,4,3,2,1];

// Hardcoded office agents for Office tab (rule 7)
const HARD_AGENTS = [
  { name: 'Tango', role: 'Leader / Orchestrator' },
  { name: 'Marcus', role: 'COO' },
  { name: 'Rayno', role: 'Software Engineer' },
  { name: 'Reva', role: 'Transaction Coordinator' },
  { name: 'Carlos', role: 'Lead Gen & CRM Manager' },
  { name: 'Nina', role: 'Content & Marketing Director' },
  { name: 'Maya', role: 'Client Success & Booking' },
];

// chess pieces mapping for Overview
const AGENT_ORDER = [
  { name: 'Tango', piece: '\u2654', coord: 'e1' },
  { name: 'Marcus', piece: '\u2655', coord: 'd1' },
  { name: 'Rayno', piece: '\u2657', coord: 'f1' },
  { name: 'Reva', piece: '\u2656', coord: 'a1' },
  { name: 'Carlos', piece: '\u2658', coord: 'b1' },
  { name: 'Nina', piece: '\u2659', coord: 'd2' },
  { name: 'Maya', piece: '\u2659', coord: 'e2' }
];

// safeArray helper
const safeArray = (v:any) => Array.isArray(v) ? v : [];

export default function Page() {
  const [tab, setTab] = useState<string>('Overview');

  // data states (all default to empty arrays)
  const [tasks, setTasks] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [office, setOffice] = useState<any[]>([]);

  // modal state
  const [selectedAgent, setSelectedAgent] = useState<any|null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string|null>(null);

  // Single useEffect on mount - fetch data defensively
  useEffect(()=>{
    (async ()=>{
      try{
        // tasks
        try{
          const res = await fetch('/api/mission/tasks');
          if(res.ok){ const d = await res.json(); setTasks(Array.isArray(d)?d:(d?.tasks ?? d?.items ?? [])); } else setTasks([]);
        }catch(e){ console.error('tasks fetch',e); setTasks([]); }

        // calendar
        try{
          const res = await fetch('/api/mission/calendar');
          if(res.ok){ const d = await res.json(); setCalendar(Array.isArray(d)?d:(d?.events ?? d?.items ?? [])); } else setCalendar([]);
        }catch(e){ console.error('calendar fetch',e); setCalendar([]); }

        // projects
        try{
          const res = await fetch('/api/mission/projects');
          if(res.ok){ const d = await res.json(); setProjects(Array.isArray(d)?d:(d?.projects ?? d?.items ?? [])); } else setProjects([]);
        }catch(e){ console.error('projects fetch',e); setProjects([]); }

        // memories
        try{
          const res = await fetch('/api/mission/memories');
          if(res.ok){ const d = await res.json(); setMemories(Array.isArray(d)?d:(d?.memories ?? d?.items ?? [])); } else setMemories([]);
        }catch(e){ console.error('memories fetch',e); setMemories([]); }

        // office (agents) - but we will keep hardcoded agents for Office tab per rule 7
        setOffice(HARD_AGENTS);

      }catch(e){
        console.error('initial load error', e);
        // ensure everything is at least arrays
        setTasks([]); setCalendar([]); setProjects([]); setMemories([]); setOffice(HARD_AGENTS);
      }
    })();
  },[]);

  // tap-on-shoulder send
  const tapSend = async (agentName:string)=>{
    setSending(true); setSendResult(null);
    try{
      await fetch('/api/mission/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({agent: agentName, text: message}) });
      setSendResult('Sent'); setMessage('');
    }catch(e){ console.error('tap send',e); setSendResult('Error'); }
    setSending(false);
  }

  // chess helpers
  const findAgent = (name:string) => (HARD_AGENTS.find(a=>a.name===name) || null);
  const getAgentAt = (coord:string)=>{
    const map:any = Object.fromEntries(AGENT_ORDER.map((a:any)=>[a.coord,a.name]));
    const name = map[coord]; if(!name) return null; return { name, ...(findAgent(name)||{}), piece: AGENT_ORDER.find((x:any)=>x.name===name)?.piece };
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="text-amber-400 font-bold text-2xl">Mission Control</div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-amber-600 rounded text-black">Tango Online</div>
          <div className="text-sm text-gray-200">{safeArray(office).length}/7 active</div>
        </div>
      </header>

      <div className="flex gap-6">
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
          {/* Overview - chessboard (unchanged) */}
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
                          <button onClick={()=>setSelectedAgent(agent)} className="flex flex-col items-center justify-center w-full h-full" title={`${agent.name} - ${agent.role}`}>
                            <div className="text-4xl text-white" style={{textShadow:'0 2px 6px rgba(0,0,0,0.6)'}}>{agent.piece}</div>
                            <div className="text-xs font-bold text-white mt-1" style={{textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>{agent.name}</div>
                            <span className={`absolute top-1 right-1 w-3 h-3 rounded-full ${agent?.status==='active'?'bg-green-500':agent?.status==='idle'?'bg-yellow-400':'bg-gray-400'}`}></span>
                          </button>
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

          {/* Tasks - 3 columns (Todo, In Progress, Done) */}
          {tab==='Tasks' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Tasks</h2>
              <div className="grid grid-cols-3 gap-4">
                {["Todo","In Progress","Done"].map(col=> (
                  <div key={col} className="bg-slate-800 p-3 rounded border border-slate-700">
                    <h3 className="font-semibold mb-2">{col}</h3>
                    {safeArray(tasks).filter((t:any)=> (col==='Todo'? (t?.status==='todo') : col==='In Progress'?(t?.status==='in_progress'):(t?.status==='done'))).map((t:any,i:number)=>(
                      <div key={i} className="bg-slate-900 p-2 rounded mb-2">{t?.title ?? 'Untitled'}</div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Calendar - strictly static 7-day grid */}
          {tab==='Calendar' && (
            <section className="p-4">
              <h2 className="text-xl font-bold text-amber-400 mb-4">Calendar</h2>
              <div className="space-y-3">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=> (
                  <div key={day} className="bg-slate-800 rounded p-3">
                    <span className="text-amber-400 font-semibold">{day}</span>
                    <span className="text-slate-400 ml-3 text-sm">{safeArray((sampleCalendar as any)[day]).length ? safeArray((sampleCalendar as any)[day]).join(', ') : 'No events'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
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
                          <div style={{width:`${Number(p?.progress||0)}%`}} className="bg-green-600 h-3"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Memories */}
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

          {/* Office - hardcoded 7 agents */}
          {tab==='Office' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Office</h2>
              <div className="grid grid-cols-7 gap-3">
                {safeArray(HARD_AGENTS).map((a:any,idx:number)=> (
                  <div key={idx} className="bg-slate-800 p-3 rounded text-center">
                    <div className="font-bold">{a?.name}</div>
                    <div className="text-sm text-gray-400">{a?.role}</div>
                    <div className="mt-2"><span className="w-2 h-2 inline-block rounded-full bg-gray-400"></span></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Chat (static) */}
          {tab==='Chat' && (
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-2">Chat</h2>
              <textarea className="w-full p-2 bg-slate-800 rounded mb-2" placeholder="Send a message..."></textarea>
              <div className="flex justify-end"><button className="px-3 py-2 bg-amber-600 text-black rounded">Send</button></div>
            </section>
          )}

        </section>
      </main>
    </div>
  )
}
