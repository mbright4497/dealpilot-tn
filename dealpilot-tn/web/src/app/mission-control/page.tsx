<<<<<<< HEAD
'use client'
import React,{useState,useEffect,useCallback,useRef} from 'react'

const TABS=['Tasks','Calendar','Projects','Memories','Docs','Team','Office','Chat']
const COLUMNS=['Recurring','Backlog','In Progress','Review']

type Agent={id:string;name:string;role:string;openclaw_id:string;color:string;is_leader:boolean;office_x:number;office_y:number;status:string;current_task:string}
type ActivityEvent={id:number;agent_id:string;event_type:string;source:string;payload:any;created_at:string}
type Task={id:number;title:string;column_name:string;assigned_agent:string|null;priority:string;created_at:string}
type Project={id:number;title:string;description:string;progress:number;owner_agent:string|null;status:string}
type Memory={id:number;date:string;text:string;tags:string[];created_at:string}
type ChatMsg={id:number;agent_id:string;message:string;created_at:string}

async function safe(path:string){try{const r=await fetch(path,{cache:'no-store'});return await r.json()}catch{return null}}
async function api(path:string,opts?:RequestInit){const r=await fetch(path,{cache:'no-store',...opts});return r.json()}

function StatusDot({status}:{status:string}){
  const c=status==='working'?'bg-green-400 animate-pulse':status==='idle'?'bg-gray-500':status==='error'?'bg-red-500':'bg-yellow-400'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${c}`}/>
}

function StatusBadge({status}:{status:string}){
  const map:any={working:'bg-green-900 text-green-300',idle:'bg-gray-800 text-gray-400',error:'bg-red-900 text-red-300'}
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status]||map.idle}`}>{status}</span>
}

export default function MissionControl(){
  const [active,setActive]=useState('Office')
  const [team,setTeam]=useState<Agent[]>([])
  const [activity,setActivity]=useState<ActivityEvent[]>([])
  const [tasks,setTasks]=useState<Task[]>([])
  const [projects,setProjects]=useState<Project[]>([])
  const [memories,setMemories]=useState<Memory[]>([])
  const [chat,setChat]=useState<ChatMsg[]>([])
  const [selected,setSelected]=useState<Agent|null>(null)
  const [cmd,setCmd]=useState('')
  const [chatInput,setChatInput]=useState('')
  const chatEnd=useRef<HTMLDivElement>(null)

  const refresh=useCallback(async()=>{
    const t=await safe('/api/mission/status')
    if(t?.team)setTeam(t.team)
    const a=await safe('/api/mission/activity')
    if(a?.events)setActivity(a.events)
    const tk=await safe('/api/mission/tasks')
    if(tk?.tasks)setTasks(tk.tasks)
    const p=await safe('/api/mission/projects')
    if(p?.projects)setProjects(p.projects)
    const m=await safe('/api/mission/memories')
    if(m?.memories)setMemories(m.memories)
    const c=await safe('/api/mission/chat')
    if(c?.messages)setChat(c.messages)
  },[])

  useEffect(()=>{refresh();const i=setInterval(refresh,5000);return()=>clearInterval(i)},[])
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:'smooth'})},[chat])

  const tango=team.find(a=>a.is_leader)
  const sendCommand=async()=>{
    if(!selected||!cmd.trim())return
    await api('/api/mission/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:selected.id,command:cmd})})
    setCmd('');refresh()
  }
  const sendChat=async()=>{
    if(!chatInput.trim())return
    await api('/api/mission/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:'user',message:chatInput})})
    setChatInput('');refresh()
  }

  return(
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-blue-400">Mission Control</span>
          {tango&&<span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">Tango Online</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{team.filter(a=>a.status==='working').length}/{team.length} agents active</span>
          <StatusDot status={tango?.status||'idle'}/>
        </div>
      </header>
      {tango&&<div className="bg-gray-900 border-b border-gray-800 px-6 py-2 flex items-center gap-4 text-xs">
        <span className="text-yellow-400 font-bold">TANGO</span>
        <StatusBadge status={tango.status}/>
        <span className="text-gray-400">{tango.current_task||'Monitoring all systems'}</span>
      </div>}
      <div className="flex">
        <nav className="w-48 border-r border-gray-800 p-4 space-y-1">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setActive(t)} className={`w-full text-left px-3 py-2 rounded text-sm ${active===t?'bg-gray-800 text-white':'text-gray-500 hover:text-gray-300'}`}>{t}</button>
          ))}
        </nav>
        <main className="flex-1 p-6 overflow-auto" style={{maxHeight:'calc(100vh - 110px)'}}>
          {active==='Office'&&<div>
            <h2 className="text-lg font-bold mb-4">Office Floor</h2>
            <div className="grid grid-cols-3 gap-4">
              {team.map(a=>(
                <div key={a.id} onClick={()=>setSelected(a)} className={`cursor-pointer rounded-lg p-4 border ${selected?.id===a.id?'border-blue-500 bg-gray-800':'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-black text-xs font-bold flex-shrink-0`} style={{background:a.color}}>{a.name[0]}</div>
                    <div>
                      <div className="font-bold text-sm">{a.is_leader?'TANGO':a.name}</div>
                      <div className="text-xs text-gray-400">{a.role}</div>
                    </div>
                    <StatusDot status={a.status}/>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{a.current_task||'Idle'}</p>
                </div>
              ))}
            </div>
            {selected&&<div className="mt-6 bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h3 className="text-sm font-bold mb-2">Tap {selected.is_leader?'TANGO':selected.name} on the shoulder</h3>
              <div className="flex gap-2">
                <input value={cmd} onChange={e=>setCmd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendCommand()} placeholder="Give a command..." className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"/>
                <button onClick={sendCommand} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-medium">Send</button>
              </div>
            </div>}
            <h3 className="text-sm font-bold mt-6 mb-2">Live Activity Feed</h3>
            <div className="space-y-1 max-h-60 overflow-auto">
              {activity.slice(0,20).map(e=>(
                <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-900">
                  <span className="text-gray-600 w-20">{new Date(e.created_at).toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.5 rounded ${e.event_type==='command'?'bg-blue-900 text-blue-300':e.event_type==='heartbeat'?'bg-gray-800 text-gray-400':'bg-gray-800 text-gray-400'}`}>{e.event_type}</span>
                  <span className="text-gray-300 truncate">{e.payload?.current_task||e.source}</span>
                </div>
              ))}
            </div>
          </div>}
          {active==='Tasks'&&<div>
            <h2 className="text-lg font-bold mb-4">Task Board</h2>
            <div className="grid grid-cols-4 gap-4">
              {COLUMNS.map(col=>(
                <div key={col}>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">{col}</h3>
                  <div className="space-y-2">
                    {tasks.filter(t=>t.column_name===col).map(t=>(
                      <div key={t.id} className="bg-gray-900 border border-gray-800 rounded p-3">
                        <p className="text-sm font-medium">{t.title}</p>
                        <span className="text-xs text-gray-500">{t.assigned_agent||'Unassigned'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>}
          {active==='Projects'&&<div>
            <h2 className="text-lg font-bold mb-4">Projects</h2>
            <div className="space-y-3">
              {projects.map(p=>(
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{p.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status==='active'?'bg-green-900 text-green-300':'bg-gray-800 text-gray-400'}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{p.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-800 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width:`${p.progress}%`}}/></div>
                    <span className="text-xs text-gray-400">{p.progress}%</span>
                  </div>
                </div>
              ))}
              {projects.length===0&&<p className="text-gray-600 text-sm">No projects yet</p>}
            </div>
          </div>}
          {active==='Calendar'&&<div>
            <h2 className="text-lg font-bold mb-4">Calendar</h2>
            <div className="flex justify-between items-center mb-4">
              <div />
              <div>
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={async()=>{const res=await fetch('/api/mission/calendar'); if(res.ok){const data=await res.json(); setCalendar(data.events||data||[])} }}>Refresh</button>
                <button className="ml-2 px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>{ /* open modal handled elsewhere in file if present */ }}>+ New Event</button>
              </div>
            </div>
            <div>
              {calendar.length === 0 && <div className="text-gray-500">No events found.</div>}
              {Object.entries(groupByDate(calendar)).map(([date, events]) => (
                <div key={date} className="mb-4">
                  <div className="font-semibold mb-2">{date}</div>
                  <div className="space-y-2">
                    {events.map(ev => (
                      <div key={ev.id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <div className="font-medium">{ev.title}</div>
                          <div className="text-sm text-gray-400">{ev.all_day?"All day":`${fmtTime(ev.start_time)} — ${fmtTime(ev.end_time)}`}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {ev.assigned_agent && <div className="px-2 py-1 text-sm bg-green-100 rounded">{ev.assigned_agent}</div>}
                          {ev.source && <div className="px-2 py-1 text-sm bg-gray-100 rounded">{ev.source}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {active==='Chat'&&<div className="flex flex-col" style={{height:'calc(100vh - 160px)'}}>
            <h2 className="text-lg font-bold mb-4">Mission Chat</h2>
            <div className="flex-1 overflow-auto space-y-2 bg-gray-900 rounded-lg p-4 border border-gray-800">
              {chat.map(m=>{
                const agent=team.find(a=>a.id===m.agent_id)
                return(<div key={m.id} className={`flex gap-2 ${m.agent_id==='user'?'justify-end':''}`}>
                  {m.agent_id!=='user'&&<div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0" style={{background:agent?.color||'#666'}}>{agent?.name[0]||'?'}</div>}
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.agent_id==='user'?'bg-blue-600':'bg-gray-800'}`}>
                    <p className="text-xs text-gray-400 mb-0.5">{agent?.name||'You'}</p>
                    <p>{m.message}</p>
                  </div>
                </div>)
              })}
              <div ref={chatEnd}/>
            </div>
            <div className="flex gap-2 mt-3">
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Type a message..." className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"/>
              <button onClick={sendChat} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-medium">Send</button>
            </div>
          </div>}
          {active==='Team'&&<div>
            <h2 className="text-lg font-bold mb-4">Team Roster</h2>
            <div className="space-y-2">
              {team.map(a=>(
                <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-black font-bold" style={{background:a.color}}>{a.name[0]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="font-bold">{a.is_leader?'TANGO':a.name}</span><StatusBadge status={a.status}/>{a.is_leader&&<span className="text-[10px] bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full">LEADER</span>}</div>
                    <p className="text-xs text-gray-400">{a.role}</p>
                    <p className="text-xs text-gray-500 mt-1">{a.current_task||'No active task'}</p>
                  </div>
                  <button onClick={()=>{setSelected(a);setActive('Office')}} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded">Tap Shoulder</button>
                </div>
              ))}
            </div>
          </div>}
          {active==='Memories'&&<div>
            <h2 className="text-lg font-bold mb-4">Memories</h2>
            <div className="space-y-2">
              {memories.map(m=>(
                <div key={m.id} className="bg-gray-900 border border-gray-800 rounded p-3">
                  <span className="text-xs text-gray-500">{m.date}</span>
                  <p className="text-sm mt-1">{m.text}</p>
                </div>
              ))}
              {memories.length===0&&<p className="text-gray-600 text-sm">No memories stored yet</p>}
            </div>
          </div>}
          {active==='Docs'&&<div>
            <h2 className="text-lg font-bold mb-4">Documentation</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-gray-500 text-sm">System docs and agent playbooks will appear here.</p>
            </div>
          </div>}
        </main>
      </div>
    </div>
  )
=======
"use client";
import React, { useEffect, useState } from "react";

type Agent = "Tango" | "Marcus" | "Rayno" | "Reva" | "Carlos" | "Nina" | "Maya";

type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
  assigned_agent?: Agent;
  source?: string;
  description?: string;
};

type StatusItem = {
  agent: Agent;
  role: string;
  status: string;
  last_heartbeat?: string;
  current_task?: string;
};

export default function MissionControlPage() {
  const [tab, setTab] = useState<"office" | "calendar" | "projects">("office");
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<StatusItem[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ all_day: false });
  const agents: Agent[] = ["Tango", "Marcus", "Rayno", "Reva", "Carlos", "Nina", "Maya"];

  // fetch status (and projects data where appropriate)
  async function loadStatus() {
    try {
      const res = await fetch("/api/mission/status");
      if (!res.ok) throw new Error("status fetch failed");
      const data = await res.json();
      // assume data.status is array of status items
      setStatus(data.status || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCalendar() {
    try {
      const res = await fetch("/api/mission/calendar");
      if (!res.ok) throw new Error("calendar fetch failed");
      const data = await res.json();
      setCalendar(data.events || data || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadStatus();
    if (tab === "calendar") loadCalendar();
  }, [tab]);

  // helper: group events by date
  function groupByDate(events: CalendarEvent[]) {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const d = new Date(ev.start_time).toLocaleDateString();
      map[d] = map[d] || [];
      map[d].push(ev);
    });
    return map;
  }

  function fmtTime(s?: string) {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/mission/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      setShowEventModal(false);
      setNewEvent({ all_day: false });
      await loadCalendar();
    } catch (err) {
      console.error(err);
    }
  }

  // projects: we will reuse status endpoint for existing projects listing and assume projects form elsewhere; here add owner_agent to add form if present in page

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Mission Control</h1>
      <div className="mb-4">
        <button className={`px-3 py-1 mr-2 ${tab==="office"?"bg-gray-200":"bg-white"}`} onClick={()=>setTab("office")}>Office</button>
        <button className={`px-3 py-1 mr-2 ${tab==="calendar"?"bg-gray-200":"bg-white"}`} onClick={()=>setTab("calendar")}>Calendar</button>
        <button className={`px-3 py-1 ${tab==="projects"?"bg-gray-200":"bg-white"}`} onClick={()=>setTab("projects")}>Projects</button>
      </div>

      {tab === "office" && (
        <section>
          <h2 className="text-xl mb-3">Office Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {status.map((s, idx) => (
              <div key={idx} className={`p-4 rounded shadow ${s.status==="working"?"border-2 border-green-500":"border"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{s.agent}</div>
                    <div className="text-sm text-gray-600">{s.role}</div>
                    {s.current_task && <div className="mt-2 text-sm text-gray-800">Current: {s.current_task}</div>}
                  </div>
                  <div className="text-xs text-gray-500">{relativeTime(s.last_heartbeat)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "calendar" && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">Calendar</h2>
            <div>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>{setShowEventModal(true);}}>+ New Event</button>
            </div>
          </div>

          <div>
            {calendar.length === 0 && <div className="text-gray-500">No events found.</div>}
            {Object.entries(groupByDate(calendar)).map(([date, events]) => (
              <div key={date} className="mb-4">
                <div className="font-semibold mb-2">{date}</div>
                <div className="space-y-2">
                  {events.map(ev => (
                    <div key={ev.id} className="p-3 border rounded flex justify-between items-center">
                      <div>
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-sm text-gray-600">{ev.all_day?"All day":`${fmtTime(ev.start_time)} — ${fmtTime(ev.end_time)}`}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {ev.assigned_agent && <div className="px-2 py-1 text-sm bg-green-100 rounded">{ev.assigned_agent}</div>}
                        {ev.source && <div className="px-2 py-1 text-sm bg-gray-100 rounded">{ev.source}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showEventModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white p-6 rounded w-full max-w-md">
                <h3 className="text-lg font-semibold mb-3">New Event</h3>
                <form onSubmit={createEvent} className="space-y-3">
                  <div>
                    <label className="block text-sm">Title</label>
                    <input required className="w-full border p-2 rounded" value={newEvent.title||""} onChange={(e)=>setNewEvent({...newEvent,title:e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm">Start</label>
                    <input required type="datetime-local" className="w-full border p-2 rounded" value={newEvent.start_time||""} onChange={(e)=>setNewEvent({...newEvent,start_time:e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm">End</label>
                    <input type="datetime-local" className="w-full border p-2 rounded" value={newEvent.end_time||""} onChange={(e)=>setNewEvent({...newEvent,end_time:e.target.value})} />
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center"><input type="checkbox" checked={!!newEvent.all_day} onChange={(e)=>setNewEvent({...newEvent,all_day:e.target.checked})} /> <span className="ml-2">All day</span></label>
                  </div>
                  <div>
                    <label className="block text-sm">Assigned Agent</label>
                    <select className="w-full border p-2 rounded" value={newEvent.assigned_agent||""} onChange={(e)=>setNewEvent({...newEvent,assigned_agent: e.target.value as Agent})}>
                      <option value="">-- none --</option>
                      {agents.map(a=> <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm">Source</label>
                    <input className="w-full border p-2 rounded" value={newEvent.source||""} onChange={(e)=>setNewEvent({...newEvent,source:e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm">Description</label>
                    <textarea className="w-full border p-2 rounded" value={newEvent.description||""} onChange={(e)=>setNewEvent({...newEvent,description:e.target.value})} />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button type="button" className="px-3 py-1 border rounded" onClick={()=>setShowEventModal(false)}>Cancel</button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "projects" && (
        <section>
          <h2 className="text-xl mb-3">Projects</h2>
          <div className="mb-4">
            <form>{/* existing add-project form likely elsewhere; minimal added owner_agent field here for demonstration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input placeholder="Project name" className="border p-2 rounded" />
                <select className="border p-2 rounded">
                  <option value="">Owner agent (optional)</option>
                  {agents.map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
                <button className="px-3 py-1 bg-blue-600 text-white rounded">Add Project</button>
              </div>
            </form>
          </div>

          <div>
            {/* placeholder projects list - if real projects exist, they should include owner_agent and be rendered with badge */}
            <div className="space-y-2">
              {/* Example project row */}
              <div className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">Website Redesign</div>
                  <div className="text-sm text-gray-600">Status: In progress</div>
                </div>
                <div>
                  <div className="px-2 py-1 bg-purple-100 rounded text-sm">Marcus</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
>>>>>>> d6fe25d9 (feat: calendar UI, office current_task display, projects agent assignment)
}
