'use client'
import React,{useState,useEffect,useCallback,useRef} from 'react'

/* -- CONSTANTS -- */
const TABS=['Tasks','Calendar','Projects','Memories','Docs','Team','Office']
const COLUMNS=['Recurring','Backlog','In Progress','Review']

/* -- TYPES -- */
type Agent={id:string;name:string;role:string;openclaw_id:string;color:string;is_leader:boolean;office_x:number;office_y:number;model:string;status:'idle'|'working'|'error'|'offline';current_task:string|null;last_heartbeat:string|null;updated_at:string|null}
type ActivityEvent={id:number;agent_id:string;event_type:string;source:string;payload:any;created_at:string}
type Task={id:number;title:string;column_name:string;assigned_agent:string|null;priority:string;created_at:string}
type Project={id:number;title:string;description:string;progress:number;owner_agent:string|null;status:string}
type Memory={id:number;date:string;text:string;tags:string[];created_at:string}

/* -- API HELPERS -- */
async function api(path:string,opts?:RequestInit){const r=await fetch(path,{cache:'no-store',...opts});return r.json()}

/* -- STATUS DOT -- */
function StatusDot({status}:{status:string}){
  const c=status==='working'?'bg-green-400 animate-pulse':status==='idle'?'bg-gray-500':status==='error'?'bg-red-500':'bg-gray-700'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${c}`}/>
}

/* -- STATUS BADGE -- */
function StatusBadge({status}:{status:string}){
  const map:any={working:'bg-green-900 text-green-300',idle:'bg-gray-800 text-gray-400',error:'bg-red-900 text-red-300',offline:'bg-gray-900 text-gray-600'}
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status]||map.offline}`}>{status}</span>
}

/* -- MAIN COMPONENT -- */
export default function MissionControl(){
  const [active,setActive]=useState('Office')
  const [team,setTeam]=useState<Agent[]>([])
  const [activity,setActivity]=useState<ActivityEvent[]>([])
  const [loading,setLoading]=useState(true)
  const pollRef=useRef<any>(null)
  const loadStatus=useCallback(async()=>{
    try{
      const d=await api('/api/mission/status')
      if(d.team) setTeam(d.team)
      if(d.activity) setActivity(d.activity)
      setLoading(false)
    }catch(e){setLoading(false)}
  },[])
  useEffect(()=>{
    loadStatus()
    pollRef.current=setInterval(loadStatus,5000)
    return()=>clearInterval(pollRef.current)
  },[loadStatus])
  const agentNames=team.map(a=>a.name)
  return(
    <div style={{minHeight:'100vh'}} className="bg-[#0f172a] text-white flex">
      <aside style={{width:200}} className="border-r border-gray-800 p-4 flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Mission Control</h2>
          <p className="text-xs text-gray-500 mt-1">Powered by OpenClaw</p>
        </div>
        {/* Live team mini-roster */}
        <div className="mb-4 space-y-1">
          {team.map(a=>(
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <StatusDot status={a.status}/>
              <span className="truncate">{a.name}</span>
              {a.is_leader&&<span className="text-amber-400 text-[8px]">LEAD</span>}
            </div>
          ))}
        </div>
        <nav className="flex flex-col gap-1">
          {TABS.map(tab=>(
            <button key={tab} onClick={()=>setActive(tab)}
              className={`text-left px-3 py-2 rounded text-sm ${active===tab?'bg-blue-700 text-white':'hover:bg-gray-800 text-gray-300'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {active==='Office'&&<OfficeView team={team} activity={activity} onRefresh={loadStatus}/>}
        {active==='Team'&&<TeamView team={team} activity={activity} onRefresh={loadStatus}/>}
        {active==='Tasks'&&<TasksView agents={agentNames}/>}
        {active==='Calendar'&&<CalendarView/>}
        {active==='Projects'&&<ProjectsView agents={agentNames}/>}
        {active==='Memories'&&<MemoriesView/>}
        {active==='Docs'&&<DocsView/>}
      </main>
    </div>
  )
}

/* -- COMMAND MODAL -- */
function CommandModal({agent,onClose,onSend}:{agent:Agent;onClose:()=>void;onSend:(cmd:string)=>Promise<void>}){
  const [cmd,setCmd]=useState('')
  const [sending,setSending]=useState(false)
  const [sent,setSent]=useState(false)
  const send=async()=>{
    if(!cmd.trim())return
    setSending(true)
    await onSend(cmd)
    setSending(false)
    setSent(true)
    setTimeout(()=>{setSent(false);onClose()},1500)
  }
  return(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0f172a] border border-gray-700 rounded-xl p-6 w-[440px] max-w-[90vw]" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${agent.color} flex items-center justify-center font-bold text-black`}>{agent.name[0]}</div>
          <div>
            <div className="font-semibold">{agent.name} {agent.is_leader&&<span className="text-amber-400 text-xs">LEADER</span>}</div>
            <div className="text-xs text-gray-400">{agent.role}</div>
          </div>
        </div>
        {agent.current_task&&(
          <div className="mb-3 p-2 bg-gray-900 rounded text-xs text-gray-400">
            Currently: <span className="text-gray-200">{agent.current_task}</span>
          </div>
        )}
        {sent?(
          <div className="p-4 bg-green-900/30 border border-green-800 rounded text-center text-green-300 text-sm">Command dispatched to OpenClaw</div>
        ):(
          <>
            <textarea value={cmd} onChange={e=>setCmd(e.target.value)} className="w-full bg-gray-900 text-white rounded px-3 py-2 text-sm resize-none h-24 border border-gray-700 focus:border-blue-500 outline-none" placeholder={`Tell ${agent.name} what to do...`} onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)send()}}/>
            <div className="flex gap-2 mt-3">
              <button onClick={send} disabled={sending||!cmd.trim()} className="flex-1 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">{sending?'Dispatching...':'Tap on Shoulder'}</button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 text-sm">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* -- OFFICE VIEW (Live Chessboard) -- */
function OfficeView({team,activity,onRefresh}:{team:Agent[];activity:ActivityEvent[];onRefresh:()=>void}){
  const [selected,setSelected]=useState<Agent|null>(null)
  const ROWS=6,COLS=9
  const sendCommand=async(cmd:string)=>{
    if(!selected)return
    await api('/api/mission/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:selected.id,command:cmd})})
    await onRefresh()
  }
  const getAgent=(x:number,y:number)=>team.find(a=>a.office_x===x&&a.office_y===y)
  return(
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">The Office</h1><p className="text-gray-400 text-sm mt-1">Click any agent to tap them on the shoulder</p></div>
        <button onClick={onRefresh} className="px-3 py-1.5 bg-gray-800 rounded text-sm hover:bg-gray-700">Refresh</button>
      </div>
      <div className="mb-8 p-4 bg-[#071033] rounded-xl border border-gray-800">
        <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${COLS},1fr)`}}>
          {Array.from({length:ROWS*COLS}).map((_,i)=>{
            const x=i%COLS,y=Math.floor(i/COLS)
            const agent=getAgent(x,y)
            const isEven=(x+y)%2===0
            return(
              <div key={i} onClick={()=>agent&&setSelected(agent)}
                className={`aspect-square rounded flex flex-col items-center justify-center text-xs relative ${isEven?'bg-[#0d1f4e]':'bg-[#0a1640]'} ${agent?'cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all':''}`}>
                {agent&&(<>
                  <div className={`w-8 h-8 rounded-full ${agent.color} flex items-center justify-center font-bold text-black text-sm relative`}>
                    {agent.name[0]}
                    {agent.is_leader&&<span className="absolute -top-1 -right-1 text-[8px]">&#x1F451;</span>}
                  </div>
                  <span className="mt-1 text-[9px] text-gray-300 text-center leading-tight">{agent.name}</span>
                  <div className="mt-0.5"><StatusDot status={agent.status}/></div>
                </>)}
              </div>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-3 mb-6">
        {team.map(a=>(
          <div key={a.id} onClick={()=>setSelected(a)} className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-blue-500 ${a.is_leader?'border-amber-600 bg-amber-950/20':'border-gray-800 bg-[#071033]'}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-full ${a.color} flex items-center justify-center text-black text-xs font-bold flex-shrink-0`}>{a.name[0]}</div>
              <span className={`text-xs font-medium truncate ${a.is_leader?'text-amber-400':''}`}>{a.name}</span>
            </div>
            <StatusBadge status={a.status}/>
            {a.current_task&&<p className="text-[9px] text-gray-500 mt-1 truncate">{a.current_task}</p>}
          </div>
        ))}
      </div>
      {activity.length>0&&(
        <div className="bg-[#071033] rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Live Activity Feed</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {activity.map(e=>(
              <div key={e.id} className="flex items-start gap-2 text-xs py-1 border-b border-gray-900">
                <span className="text-gray-500 flex-shrink-0">{new Date(e.created_at).toLocaleTimeString()}</span>
                <span className="text-blue-400 flex-shrink-0">{e.agent_id}</span>
                <span className={`px-1.5 rounded flex-shrink-0 ${e.event_type==='command'?'bg-blue-900 text-blue-300':e.event_type==='heartbeat'?'bg-gray-800 text-gray-400':e.event_type==='result'?'bg-green-900 text-green-300':'bg-gray-800 text-gray-400'}`}>{e.event_type}</span>
                <span className="text-gray-400 truncate">{e.payload?.command||e.payload?.current_task||e.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {selected&&<CommandModal agent={selected} onClose={()=>setSelected(null)} onSend={sendCommand}/>}
    </div>
  )
}

/* -- TEAM VIEW -- */
function TeamView({team,activity,onRefresh}:{team:Agent[];activity:ActivityEvent[];onRefresh:()=>void}){
  const [selected,setSelected]=useState<Agent|null>(null)
  const sendCommand=async(cmd:string)=>{
    if(!selected)return
    await api('/api/mission/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:selected.id,command:cmd})})
    await onRefresh()
  }
  return(
    <div>
      <h1 className="text-2xl font-bold mb-2">Team</h1>
      <p className="text-gray-400 text-sm mb-6">Your AI team - powered by OpenClaw agents</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map(a=>(
          <div key={a.id} className={`p-5 rounded-xl border ${a.is_leader?'border-amber-600 bg-amber-950/10':'border-gray-800 bg-[#071033]'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-full ${a.color} flex items-center justify-center font-bold text-black text-lg`}>{a.name[0]}</div>
              <div>
                <div className="font-semibold">{a.name} {a.is_leader&&<span className="text-amber-400 text-xs">LEADER</span>}</div>
                <div className="text-sm text-gray-400">{a.role}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">OpenClaw: {a.openclaw_id}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3"><StatusBadge status={a.status}/>{a.last_heartbeat&&<span className="text-[10px] text-gray-600">Last pulse: {new Date(a.last_heartbeat).toLocaleTimeString()}</span>}</div>
            {a.current_task&&<div className="p-2 bg-gray-900 rounded text-xs text-gray-300 mb-3">Working: {a.current_task}</div>}
            <button onClick={()=>setSelected(a)} className="w-full py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium">Tap on Shoulder</button>
          </div>
        ))}
      </div>
      {selected&&<CommandModal agent={selected} onClose={()=>setSelected(null)} onSend={sendCommand}/>}
    </div>
  )
}

/* -- TASKS (Kanban CRUD) -- */
function TasksView({agents}:{agents:string[]}){
  const [tasks,setTasks]=useState<Task[]>([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [title,setTitle]=useState('')
  const [col,setCol]=useState('Backlog')
  const [agent,setAgent]=useState('')
  const load=useCallback(()=>{api('/api/mission/tasks').then(d=>{setTasks(d.tasks||[]);setLoading(false)}).catch(()=>setLoading(false))},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!title.trim())return;await api('/api/mission/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,column_name:col,assigned_agent:agent||null})});setTitle('');setShowForm(false);load()}
  const move=async(id:number,c:string)=>{await api('/api/mission/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,column_name:c})});load()}
  const del=async(id:number)=>{await api(`/api/mission/tasks?id=${id}`,{method:'DELETE'});load()}
  if(loading) return <p className="text-gray-400">Loading tasks...</p>
  return(
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button onClick={()=>setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">+ New Task</button>
      </div>
      {showForm&&<div className="mb-4 p-4 bg-[#071033] rounded border border-gray-800 flex gap-2 flex-wrap items-end">
        <div><label className="text-xs text-gray-400 block">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded w-48" placeholder="Task title"/></div>
        <div><label className="text-xs text-gray-400 block">Column</label><select value={col} onChange={e=>setCol(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded">{COLUMNS.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className="text-xs text-gray-400 block">Assign</label><select value={agent} onChange={e=>setAgent(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded"><option value="">Unassigned</option>{agents.map(a=><option key={a}>{a}</option>)}</select></div>
        <button onClick={add} className="px-4 py-1 bg-green-600 rounded hover:bg-green-700">Add</button>
      </div>}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(column=>(
          <div key={column} className="bg-[#071033] p-4 rounded border border-gray-800 min-h-[200px]">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-300">{column}</h3>
            <ul className="space-y-2">
              {tasks.filter(t=>t.column_name===column).map(t=>(
                <li key={t.id} className="bg-gray-900 p-2 rounded group">
                  <div className="font-medium text-sm">{t.title}</div>
                  {t.assigned_agent&&<div className="text-xs text-gray-400 mt-1">@{t.assigned_agent}</div>}
                  <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {COLUMNS.filter(c=>c!==column).map(c=><button key={c} onClick={()=>move(t.id,c)} className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded hover:bg-gray-700">{c}</button>)}
                    <button onClick={()=>del(t.id)} className="text-[10px] px-1.5 py-0.5 bg-red-900 rounded hover:bg-red-800 ml-auto">x</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>)
}

/* -- CALENDAR -- */
function CalendarView(){
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const sample:Record<string,string[]>={Sun:['Weekly review'],Mon:['Client meeting 10am'],Tue:['Showing 2pm'],Wed:['Pipeline cleanup'],Thu:['Ad review'],Fri:['Contract signing'],Sat:['Open house']}
  return(
    <div>
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>
      <div className="grid grid-cols-7 gap-2">{days.map(d=>(
        <div key={d} className="p-3 bg-[#071033] rounded border border-gray-800 min-h-[120px]">
          <div className="font-semibold mb-2">{d}</div>
          <ul className="text-sm text-gray-300 space-y-1">{(sample[d]||[]).map((ev,i)=><li key={i} className="px-2 py-1 bg-gray-900 rounded">{ev}</li>)}</ul>
        </div>
      ))}</div>
    </div>)
}

/* -- PROJECTS -- */
function ProjectsView({agents}:{agents:string[]}){
  const [projects,setProjects]=useState<Project[]>([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [title,setTitle]=useState('')
  const [owner,setOwner]=useState('')
  const load=useCallback(()=>{api('/api/mission/projects').then(d=>{setProjects(d.projects||[]);setLoading(false)}).catch(()=>setLoading(false))},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!title.trim())return;await api('/api/mission/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,owner_agent:owner||null})});setTitle('');setShowForm(false);load()}
  const updateProgress=async(id:number,p:number)=>{await api('/api/mission/projects',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,progress:Math.min(100,Math.max(0,p))})});load()}
  const del=async(id:number)=>{await api(`/api/mission/projects?id=${id}`,{method:'DELETE'});load()}
  if(loading) return <p className="text-gray-400">Loading...</p>
  return(
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button onClick={()=>setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">+ New Project</button>
      </div>
      {showForm&&<div className="mb-4 p-4 bg-[#071033] rounded border border-gray-800 flex gap-2 items-end">
        <div><label className="text-xs text-gray-400 block">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded w-48" placeholder="Project name"/></div>
        <div><label className="text-xs text-gray-400 block">Owner</label><select value={owner} onChange={e=>setOwner(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded"><option value="">None</option>{agents.map(a=><option key={a}>{a}</option>)}</select></div>
        <button onClick={add} className="px-4 py-1 bg-green-600 rounded hover:bg-green-700">Add</button>
      </div>}
      <div className="space-y-4">{projects.map(p=>(
        <div key={p.id} className="bg-[#071033] p-4 rounded border border-gray-800 group">
          <div className="flex items-center justify-between">
            <div><h4 className="font-semibold">{p.title}</h4>{p.owner_agent&&<p className="text-xs text-gray-400">Owner: {p.owner_agent}</p>}</div>
            <div className="flex items-center gap-3">
              <div className="w-32"><div className="bg-gray-900 h-3 rounded overflow-hidden"><div style={{width:`${p.progress}%`}} className="bg-green-600 h-3"/></div><div className="text-xs text-gray-400 text-center mt-1">{p.progress}%</div></div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={()=>updateProgress(p.id,p.progress+10)} className="text-xs px-2 py-1 bg-gray-800 rounded hover:bg-gray-700">+10%</button>
                <button onClick={()=>del(p.id)} className="text-xs px-2 py-1 bg-red-900 rounded hover:bg-red-800">Del</button>
              </div>
            </div>
          </div>
        </div>
      ))}{projects.length===0&&<p className="text-gray-500">No projects yet.</p>}</div>
    </div>)
}

/* -- MEMORIES -- */
function MemoriesView(){
  const [memories,setMemories]=useState<Memory[]>([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [text,setText]=useState('')
  const load=useCallback(()=>{api('/api/mission/memories').then(d=>{setMemories(d.memories||[]);setLoading(false)}).catch(()=>setLoading(false))},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!text.trim())return;await api('/api/mission/memories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});setText('');setShowForm(false);load()}
  const del=async(id:number)=>{await api(`/api/mission/memories?id=${id}`,{method:'DELETE'});load()}
  if(loading) return <p className="text-gray-400">Loading...</p>
  return(
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Memories</h1>
        <button onClick={()=>setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">+ New Memory</button>
      </div>
      {showForm&&<div className="mb-4 p-4 bg-[#071033] rounded border border-gray-800 flex gap-2 items-end">
        <div className="flex-1"><label className="text-xs text-gray-400 block">What happened?</label><input value={text} onChange={e=>setText(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded w-full" placeholder="Memory entry..."/></div>
        <button onClick={add} className="px-4 py-1 bg-green-600 rounded hover:bg-green-700">Save</button>
      </div>}
      <div className="space-y-2">{memories.map(m=>(
        <div key={m.id} className="bg-[#071033] p-3 rounded border border-gray-800 flex justify-between group">
          <div><div className="text-sm text-gray-400">{m.date}</div><div className="mt-1">{m.text}</div></div>
          <button onClick={()=>del(m.id)} className="text-xs px-2 py-1 bg-red-900 rounded hover:bg-red-800 opacity-0 group-hover:opacity-100 transition-opacity self-start">x</button>
        </div>
      ))}{memories.length===0&&<p className="text-gray-500">No memories yet.</p>}</div>
    </div>)
}

/* -- DOCS -- */
function DocsView(){
  const docs=[{name:'Listing Checklist.pdf',size:'120KB'},{name:'Buyer FAQ.md',size:'15KB'},{name:'Contract Template.docx',size:'45KB'}]
  return(
    <div>
      <h1 className="text-2xl font-bold mb-4">Docs</h1>
      <div className="space-y-2">{docs.map((d,i)=>(
        <div key={i} className="bg-[#071033] p-3 rounded border border-gray-800 flex justify-between">
          <div><div className="font-medium">{d.name}</div><div className="text-sm text-gray-400">{d.size}</div></div>
        </div>
      ))}</div>
    </div>)
}
