"use client";
import React, { useEffect, useRef, useState } from "react";

type AgentName = "Tango" | "Marcus" | "Rayno" | "Reva" | "Carlos" | "Nina" | "Maya";

function fmtTime(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString();
}
function relativeTime(iso?: string) {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.round((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const AGENTS: AgentName[] = ["Tango", "Marcus", "Rayno", "Reva", "Carlos", "Nina", "Maya"];

export default function MissionControlPage() {
  const [active, setActive] = useState<string>("Office");

  // Tasks
  const [tasks, setTasks] = useState<any[]>([]);
  // Calendar
  const [calendar, setCalendar] = useState<any[]>([]);
  const [showCalModal, setShowCalModal] = useState(false);
  const [calForm, setCalForm] = useState<any>({ title: "", start_time: "", end_time: "", assigned_agent: "", description: "", all_day: false });
  // Projects
  const [projects, setProjects] = useState<any[]>([]);
  const [projForm, setProjForm] = useState<any>({ title: "", description: "", status: "active", owner_agent: "" });
  // Memories
  const [memories, setMemories] = useState<any[]>([]);
  const [memForm, setMemForm] = useState<any>({ date: "", text: "" });
  // Office/status
  const [office, setOffice] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  // Chat
  const [chat, setChat] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEnd = useRef<HTMLDivElement | null>(null);

  // Loaders
  async function loadTasks() { try { const r = await fetch('/api/mission/tasks'); if (r.ok) setTasks(await r.json() || []); } catch(e){console.error(e)} }
  async function loadCalendar() { try { const r = await fetch('/api/mission/calendar'); if (r.ok) setCalendar((await r.json())?.events || (await r.json()) || []); } catch(e){console.error(e)} }
  async function loadProjects() { try { const r = await fetch('/api/mission/projects'); if (r.ok) setProjects(await r.json() || []); } catch(e){console.error(e)} }
  async function loadMemories(){ try{ const r = await fetch('/api/mission/memories'); if(r.ok) setMemories(await r.json() || []);}catch(e){console.error(e)} }
  async function loadOffice(){ try{ const r = await fetch('/api/mission/status'); if(r.ok){ const d = await r.json(); setOffice(d.team || d.status || []); setActivityFeed(d.activity || d.events || []); } }catch(e){console.error(e)} }
  async function loadChat(){ try{ const r = await fetch('/api/mission/chat'); if(r.ok){ const d = await r.json(); if(Array.isArray(d)) setChat(d); else if(d && d.messages) setChat(d.messages); else setChat([]); } }catch(e){console.error(e)} }

  useEffect(()=>{ loadTasks(); loadCalendar(); loadProjects(); loadMemories(); loadOffice(); loadChat(); const i=setInterval(()=>loadOffice(),10000); return ()=>clearInterval(i); },[]);
  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:'smooth'}); },[chat]);

  // Tasks: add
  async function addTask(e:React.FormEvent){ e.preventDefault(); try{ await fetch('/api/mission/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:(e.target as any).title.value,status:(e.target as any).status.value})}); await loadTasks(); }catch(e){console.error(e)} }

  // Calendar: add
  async function submitCal(e:React.FormEvent){ e.preventDefault(); try{ await fetch('/api/mission/calendar',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(calForm) }); setShowCalModal(false); setCalForm({ title:'', start_time:'', end_time:'', assigned_agent:'', description:'', all_day:false }); await loadCalendar(); }catch(e){console.error(e)} }

  // Projects: add
  async function submitProject(e:React.FormEvent){ e.preventDefault(); try{ await fetch('/api/mission/projects',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(projForm) }); setProjForm({ title:'', description:'', status:'active', owner_agent:'' }); await loadProjects(); }catch(e){console.error(e)} }

  // Memories: add
  async function submitMemory(e:React.FormEvent){ e.preventDefault(); try{ await fetch('/api/mission/memories',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(memForm) }); setMemForm({ date:'', text:'' }); await loadMemories(); }catch(e){console.error(e)} }

  // Chat send
  async function sendChat(){ if(!chatInput.trim()) return; try{ await fetch('/api/mission/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text: chatInput }) }); setChatInput(''); await loadChat(); }catch(e){console.error(e)} }

  // helpers
  function groupByDate(events:any[]){ const m:any = {}; if(!Array.isArray(events)) return m; events.forEach(ev=>{ const d = fmtDate(ev.start_time); (m[d]|| (m[d]=[])).push(ev); }); return m; }

  // UI pieces
  function TabButton({name}:{name:string}){
    const activeClass = active===name? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white';
    return <button onClick={()=>setActive(name)} className={`w-full text-left px-3 py-2 rounded ${activeClass}`}>{name}</button>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* HEADER */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-400">Mission Control</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <div className="px-2 py-1 bg-green-700 text-green-100 rounded-full">Tango Online</div>
            <div>{office.filter((a:any)=>a.status==='working').length}/7 agents active</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-300">
          <div className="px-2 py-0.5 bg-yellow-700 text-yellow-100 rounded font-bold">TANGO</div>
          <div className="px-2 py-0.5 bg-slate-700 rounded"><span className="text-xs">status</span></div>
          <div className="text-gray-400">Monitoring all systems</div>
        </div>
      </header>

      <div className="flex">
        {/* SIDEBAR */}
        <aside className="w-48 border-r border-slate-800 p-4">
          <div className="space-y-1">
            {['Tasks','Calendar','Projects','Memories','Docs','Team','Office','Chat'].map(t=> (
              <TabButton key={t} name={t} />
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Tasks */}
          {active==='Tasks' && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Task Board</h2>
              <div className="mb-4 grid grid-cols-3 gap-4">
                {/* Simple kanban columns */}
                {['todo','in_progress','done'].map(col=> (
                  <div key={col} className="bg-slate-800 rounded p-3">
                    <h3 className="text-sm font-bold mb-2">{col.replace('_',' ')}</h3>
                    <div className="space-y-2">
                      {(Array.isArray(tasks)?tasks:[]).filter(t=>t?.status===col).map(t=> (
                        <div key={t?.id || Math.random()} className="bg-slate-700 p-2 rounded">{t?.title}</div>
                      )):null}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={addTask} className="flex gap-2">
                <input name="title" placeholder="New task" className="flex-1 p-2 rounded bg-slate-800" />
                <select name="status" className="p-2 rounded bg-slate-800">
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                <button className="px-3 py-2 bg-blue-600 rounded">Add</button>
              </form>
            </section>
          )}

          {/* Calendar */}
          {active==='Calendar' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Calendar</h2>
                <div>
                  <button onClick={()=>loadCalendar()} className="px-3 py-1 bg-blue-600 rounded">Refresh</button>
                  <button onClick={()=>setShowCalModal(true)} className="ml-2 px-3 py-1 bg-blue-600 rounded">+ New Event</button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(groupByDate(Array.isArray(calendar)?calendar:[])).length===0 && <div className="text-gray-400">No events</div>}
                {Object.entries(groupByDate(Array.isArray(calendar)?calendar:[])).map(([date, events])=> (
                  <div key={date}>
                    <div className="font-bold mb-2">{date}</div>
                    <div className="space-y-2">
                      {Array.isArray(events)? (events as any[]).map(ev=> (
                        <div key={ev.id} className="p-3 bg-slate-800 rounded flex justify-between items-center">
                          <div>
                            <div className="font-medium">{ev.title}</div>
                            <div className="text-sm text-gray-400">{ev.all_day? 'All day' : `${fmtTime(ev.start_time)} — ${fmtTime(ev.end_time)}`}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ev.assigned_agent && <div className="px-2 py-1 bg-green-700 text-green-100 rounded">{ev.assigned_agent}</div>}
                          </div>
                        </div>
                      )):null}
                    </div>
                  </div>
                ))}
              </div>

              {showCalModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white text-black p-6 rounded w-full max-w-md">
                    <h3 className="font-bold mb-3">New Event</h3>
                    <form onSubmit={submitCal} className="space-y-3">
                      <div>
                        <label className="block text-sm">Title</label>
                        <input className="w-full p-2 border" value={calForm.title} onChange={e=>setCalForm({...calForm,title:e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm">Start</label>
                        <input type="datetime-local" className="w-full p-2 border" value={calForm.start_time} onChange={e=>setCalForm({...calForm,start_time:e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm">End</label>
                        <input type="datetime-local" className="w-full p-2 border" value={calForm.end_time} onChange={e=>setCalForm({...calForm,end_time:e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm">Assigned Agent</label>
                        <select className="w-full p-2 border" value={calForm.assigned_agent} onChange={e=>setCalForm({...calForm,assigned_agent:e.target.value})}>
                          <option value="">-- none --</option>
                          {AGENTS.map(a=> <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">Description</label>
                        <textarea className="w-full p-2 border" value={calForm.description} onChange={e=>setCalForm({...calForm,description:e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={()=>setShowCalModal(false)} className="px-3 py-1 border">Cancel</button>
                        <button type="submit" className="px-3 py-1 bg-blue-600 text-white">Create</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </section>
          )}

          {/* Projects */}
          {active==='Projects' && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Projects</h2>
              <form onSubmit={submitProject} className="mb-4 grid grid-cols-3 gap-2">
                <input className="p-2 bg-slate-800" placeholder="Name" value={projForm.title} onChange={e=>setProjForm({...projForm,title:e.target.value})} />
                <input className="p-2 bg-slate-800" placeholder="Description" value={projForm.description} onChange={e=>setProjForm({...projForm,description:e.target.value})} />
                <select className="p-2 bg-slate-800" value={projForm.owner_agent} onChange={e=>setProjForm({...projForm,owner_agent:e.target.value})}>
                  <option value="">Owner agent (optional)</option>
                  {AGENTS.map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
                <select className="p-2 bg-slate-800" value={projForm.status} onChange={e=>setProjForm({...projForm,status:e.target.value})}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
                <div />
                <button className="px-3 py-2 bg-blue-600 rounded">Add Project</button>
              </form>

              <div className="space-y-2">
                {(Array.isArray(projects)?projects:[]).map((p:any)=> (
                  <div key={p.id} className="p-3 bg-slate-800 rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-sm text-gray-400">{p.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.owner_agent && <div className="px-2 py-1 bg-purple-700 rounded text-sm">{p.owner_agent}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Memories */}
          {active==='Memories' && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Memories</h2>
              <form onSubmit={submitMemory} className="mb-4 flex gap-2">
                <input type="date" className="p-2 bg-slate-800" value={memForm.date} onChange={e=>setMemForm({...memForm,date:e.target.value})} />
                <input className="flex-1 p-2 bg-slate-800" placeholder="Memory text" value={memForm.text} onChange={e=>setMemForm({...memForm,text:e.target.value})} />
                <button className="px-3 py-2 bg-blue-600 rounded">Add</button>
              </form>
              <div className="space-y-2">
                {(Array.isArray(memories)?memories:[]).map((m:any)=> (
                  <div key={m.id} className="p-3 bg-slate-800 rounded">
                    <div className="text-xs text-gray-400">{m.date}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Docs */}
          {active==='Docs' && (
            <section>
              <h2 className="text-lg font-semibold">Docs</h2>
              <div className="text-gray-400">Docs coming soon</div>
            </section>
          )}

          {/* Team */}
          {active==='Team' && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  {name:'Tango', role:'CEO'},
                  {name:'Marcus', role:'COO'},
                  {name:'Rayno', role:'Engineer'},
                  {name:'Reva', role:'Transactions'},
                  {name:'Carlos', role:'CRM'},
                  {name:'Nina', role:'Marketing'},
                  {name:'Maya', role:'Client'}
                ].map(t=> (
                  <div key={t.name} className="p-3 bg-slate-800 rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-sm text-gray-400">{t.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Office */}
          {active==='Office' && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Office</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Array.isArray(office)?office:[]).map((a:any)=> (
                  <div key={a.id || a.name} className={`p-4 rounded ${a.status==='working'? 'border-2 border-green-500':'border border-slate-800'} bg-slate-800`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-sm text-gray-400">{a.role}</div>
                        {a.current_task && <div className="mt-2 text-sm text-gray-300">Current: {a.current_task}</div>}
                      </div>
                      <div className="text-xs text-gray-400">{relativeTime(a.last_heartbeat)}</div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400">Status: {a.status}</div>
                  </div>
                ))}
              </div>

              <h3 className="mt-6 text-sm font-bold">Live Activity Feed</h3>
              <div className="mt-2 space-y-2 max-h-48 overflow-auto bg-slate-800 p-2 rounded">
                {(Array.isArray(activityFeed)?activityFeed:[]).map((ev:any)=> (
                  <div key={ev?.id || ev?.created_at || Math.random()} className="text-xs text-gray-300">{fmtTime(ev?.created_at)} — {ev?.source || ev?.event_type} — {ev?.payload?.current_task || ev?.payload}</div>
                ))}
              </div>
            </section>
          )}

          {/* Chat */}
          {active==='Chat' && (
            <section className="flex flex-col" style={{height:'60vh'}}>
              <h2 className="text-lg font-semibold mb-4">Mission Chat</h2>
              <div className="flex-1 overflow-auto bg-slate-800 p-4 rounded">
                {(() => {
                  const messages = Array.isArray(chat) ? chat : (chat && (chat.messages || chat.data)) || [];
                  return messages.map((m:any, idx:number)=> (
                    <div key={idx} className={`mb-2 ${(m?.sender==='Tango')? 'text-blue-200':'text-gray-200'}`}>
                      <div className="text-xs text-gray-400">{m?.sender || 'User'} • {fmtTime(m?.created_at)}</div>
                      <div>{m?.text}</div>
                    </div>
                  ));
                })()}
                <div ref={chatEnd} />
              </div>
              <div className="mt-3 flex gap-2">
                <input className="flex-1 p-2 bg-slate-800 rounded" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} />
                <button className="px-3 py-2 bg-blue-600 rounded" onClick={sendChat}>Send</button>
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}
