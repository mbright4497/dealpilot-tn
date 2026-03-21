'use client'
import React, {useState, useEffect, useCallback} from 'react'

const TABS = ['Tasks','Calendar','Projects','Memories','Docs','Team','Office']
const AGENTS = ['Marcus','Dev','Reva','Carlos','Nina','Maya']
const COLUMNS = ['Recurring','Backlog','In Progress','Review']
const TEAM = [
  {name:'Marcus',role:'COO',color:'bg-blue-500'},
  {name:'Dev',role:'Software Engineer',color:'bg-green-500'},
  {name:'Reva',role:'Transaction Coordinator',color:'bg-purple-500'},
  {name:'Carlos',role:'Lead Gen & CRM Manager',color:'bg-yellow-400'},
  {name:'Nina',role:'Content & Marketing Director',color:'bg-pink-500'},
  {name:'Maya',role:'Client Success & Booking',color:'bg-cyan-400'},
]

type Task = {id:number; title:string; description:string; column_name:string; assigned_agent:string|null; priority:string; created_at:string}
type Project = {id:number; title:string; description:string; progress:number; owner_agent:string|null; status:string; created_at:string}
type Memory = {id:number; date:string; text:string; tags:string[]; created_at:string}
type Command = {id:number; agent_id:string; command:string; status:string; result:string|null; created_at:string}

async function api(path:string, opts?:RequestInit){ const r = await fetch(path, {cache:'no-store',...opts}); return r.json() }

export default function MissionControl(){
  const [active, setActive] = useState<string>('Tasks')
  return (
    <div style={{minHeight:'100vh'}} className="bg-[#0f172a] text-white flex">
      <aside style={{width:200}} className="border-r border-gray-800 p-4 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-4">Mission Control</h2>
        <nav className="flex flex-col gap-2">
          {TABS.map(tab=> (
            <button key={tab} onClick={()=>setActive(tab)}
              className={`text-left px-3 py-2 rounded ${active===tab? 'bg-gray-700':'hover:bg-gray-800'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{active}</h1>
          <p className="text-gray-400">Manage your {active.toLowerCase()}</p>
        </header>
        <section>
          {active==='Tasks' && <TasksView />}
          {active==='Calendar' && <CalendarView />}
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

/* ─── TASKS (Kanban CRUD) ─── */
function TasksView(){
  const [tasks,setTasks]=useState<Task[]>([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [title,setTitle]=useState('')
  const [col,setCol]=useState('Backlog')
  const [agent,setAgent]=useState('')
  const load=useCallback(()=>{api('/api/mission/tasks').then(d=>{setTasks(d.tasks||[]);setLoading(false)}).catch(()=>setLoading(false))},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!title.trim())return;await api('/api/mission/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,column_name:col,assigned_agent:agent||null})});setTitle('');setShowForm(false);load()}
  const move=async(id:number,newCol:string)=>{await api('/api/mission/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,column_name:newCol})});load()}
  const del=async(id:number)=>{await api(`/api/mission/tasks?id=${id}`,{method:'DELETE'});load()}
  if(loading) return <p className="text-gray-400">Loading tasks...</p>
  return (<div>
    <button onClick={()=>setShowForm(!showForm)} className="mb-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">+ New Task</button>
    {showForm && <div className="mb-4 p-4 bg-[#071033] rounded border border-gray-800 flex gap-2 flex-wrap items-end">
      <div><label className="text-xs text-gray-400 block">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded w-48" placeholder="Task title"/></div>
      <div><label className="text-xs text-gray-400 block">Column</label><select value={col} onChange={e=>setCol(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded">{COLUMNS.map(c=><option key={c}>{c}</option>)}</select></div>
      <div><label className="text-xs text-gray-400 block">Assign</label><select value={agent} onChange={e=>setAgent(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded"><option value="">Unassigned</option>{AGENTS.map(a=><option key={a}>{a}</option>)}</select></div>
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
                {t.assigned_agent && <div className="text-xs text-gray-400 mt-1">@{t.assigned_agent}</div>}
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

/* ─── CALENDAR (static weekly + tasks with dates) ─── */
function CalendarView(){
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const sample:Record<string,string[]>={Sun:['Weekly review'],Mon:['Client meeting 10am'],Tue:['Showing 2pm'],Wed:['Pipeline cleanup'],Thu:['Advertising review'],Fri:['Contract signing'],Sat:['Open house']}
  return (<div className="grid grid-cols-7 gap-2">
    {days.map(d=>(<div key={d} className="p-3 bg-[#071033] rounded border border-gray-800 min-h-[120px]">
      <div className="font-semibold mb-2">{d}</div>
      <ul className="text-sm text-gray-300 space-y-1">{(sample[d]||[]).map((ev,i)=><li key={i} className="px-2 py-1 bg-gray-900 rounded">{ev}</li>)}</ul>
    </div>))}
  </div>)
}

/* ─── PROJECTS (CRUD) ─── */
function ProjectsView(){
  const [projects,setProjects]=useState<Project[]>([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [title,setTitle]=useState('')
  const [owner,setOwner]=useState('')
  const load=useCallback(()=>{api('/api/mission/projects').then(d=>{setProjects(d.projects||[]);setLoading(false)}).catch(()=>setLoading(false))},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!title.trim())return;await api('/api/mission/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,owner_agent:owner||null})});setTitle('');setShowForm(false);load()}
  const updateProgress=async(id:number,progress:number)=>{await api('/api/mission/projects',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,progress:Math.min(100,Math.max(0,progress))})});load()}
  const del=async(id:number)=>{await api(`/api/mission/projects?id=${id}`,{method:'DELETE'});load()}
  if(loading) return <p className="text-gray-400">Loading projects...</p>
  return (<div>
    <button onClick={()=>setShowForm(!showForm)} className="mb-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">+ New Project</button>
    {showForm && <div className="mb-4 p-4 bg-[#071033] rounded border border-gray-800 flex gap-2 items-end">
      <div><label className="text-xs text-gray-400 block">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded w-48" placeholder="Project name"/></div>
      <div><label className="text-xs text-gray-400 block">Owner</label><select value={owner} onChange={e=>setOwner(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded"><option value="">None</option>{AGENTS.map(a=><option key={a}>{a}</option>)}</select></div>
      <button onClick={add} className="px-4 py-1 bg-green-600 rounded hover:bg-green-700">Add</button>
    </div>}
    <div className="space-y-4">
      {projects.map(p=>(<div key={p.id} className="bg-[#071033] p-4 rounded border border-gray-800 group">
        <div className="flex items-center justify-between">
          <div><h4 className="font-semibold">{p.title}</h4>{p.owner_agent&&<p className="text-xs text-gray-400">Owner: {p.owner_agent}</p>}</div>
          <div className="flex items-center gap-3">
            <div className="w-32">
              <div className="bg-gray-900 h-3 rounded overflow-hidden"><div style={{width:`${p.progress}%`}} className="bg-green-600 h-3"/></div>
              <div className="text-xs text-gray-400 text-center mt-1">{p.progress}%</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>updateProgress(p.id,p.progress+10)} className="text-xs px-2 py-1 bg-gray-800 rounded hover:bg-gray-700">+10%</button>
              <button onClick={()=>del(p.id)} className="text-xs px-2 py-1 bg-red-900 rounded hover:bg-red-800">Del</button>
            </div>
          </div>
        </div>
      </div>))}
      {projects.length===0 && <p className="text-gray-500">No projects yet. Click + New Project to create one.</p>}
    </div>
  </div>)
}

/* ─── MEMORIES (CRUD) ─── */
function MemoriesView(){
  const [memories,setMemories]=useState<Memory[]>([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [text,setText]=useState('')
  const load=useCallback(()=>{api('/api/mission/memories').then(d=>{setMemories(d.memories||[]);setLoading(false)}).catch(()=>setLoading(false))},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!text.trim())return;await api('/api/mission/memories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});setText('');setShowForm(false);load()}
  const del=async(id:number)=>{await api(`/api/mission/memories?id=${id}`,{method:'DELETE'});load()}
  if(loading) return <p className="text-gray-400">Loading memories...</p>
  return (<div>
    <button onClick={()=>setShowForm(!showForm)} className="mb-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">+ New Memory</button>
    {showForm && <div className="mb-4 p-4 bg-[#071033] rounded border border-gray-800 flex gap-2 items-end">
      <div className="flex-1"><label className="text-xs text-gray-400 block">What happened?</label><input value={text} onChange={e=>setText(e.target.value)} className="bg-gray-900 text-white px-2 py-1 rounded w-full" placeholder="Memory entry..."/></div>
      <button onClick={add} className="px-4 py-1 bg-green-600 rounded hover:bg-green-700">Save</button>
    </div>}
    <div className="space-y-2">
      {memories.map(m=>(<div key={m.id} className="bg-[#071033] p-3 rounded border border-gray-800 flex justify-between group">
        <div><div className="text-sm text-gray-400">{m.date}</div><div className="mt-1">{m.text}</div></div>
        <button onClick={()=>del(m.id)} className="text-xs px-2 py-1 bg-red-900 rounded hover:bg-red-800 opacity-0 group-hover:opacity-100 transition-opacity self-start">x</button>
      </div>))}
      {memories.length===0 && <p className="text-gray-500">No memories yet.</p>}
    </div>
  </div>)
}

/* ─── DOCS (static for now) ─── */
function DocsView(){
  const docs=[{name:'Listing Checklist.pdf',size:'120KB'},{name:'Buyer FAQ.md',size:'15KB'},{name:'Contract Template.docx',size:'45KB'}]
  return (<div className="space-y-2">{docs.map((d,i)=>(<div key={i} className="bg-[#071033] p-3 rounded border border-gray-800 flex justify-between">
    <div><div className="font-medium">{d.name}</div><div className="text-sm text-gray-400">{d.size}</div></div>
  </div>))}</div>)
}

/* ─── TEAM (with Command Agent) ─── */
function TeamView(){
  const [cmdAgent,setCmdAgent]=useState<string|null>(null)
  const [cmdText,setCmdText]=useState('')
  const [commands,setCommands]=useState<Command[]>([])
  const [sending,setSending]=useState(false)
  const loadCmds=useCallback(()=>{api('/api/mission/commands').then(d=>setCommands(d.commands||[])).catch(()=>{})},[])
  useEffect(()=>{loadCmds()},[loadCmds])
  const send=async()=>{if(!cmdAgent||!cmdText.trim())return;setSending(true);await api('/api/mission/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:cmdAgent,command:cmdText})});setCmdText('');setCmdAgent(null);setSending(false);loadCmds()}
  return (<div>
    {cmdAgent && <div className="mb-4 p-4 bg-[#071033] rounded border border-blue-700">
      <div className="text-sm text-gray-400 mb-2">Command for <span className="text-white font-semibold">{cmdAgent}</span></div>
      <div className="flex gap-2">
        <input value={cmdText} onChange={e=>setCmdText(e.target.value)} className="bg-gray-900 text-white px-3 py-2 rounded flex-1" placeholder={`Tell ${cmdAgent} what to do...`} onKeyDown={e=>e.key==='Enter'&&send()}/>
        <button onClick={send} disabled={sending} className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50">{sending?'Sending...':'Send'}</button>
        <button onClick={()=>setCmdAgent(null)} className="px-3 py-2 bg-gray-800 rounded hover:bg-gray-700">Cancel</button>
      </div>
    </div>}
    <div className="grid grid-cols-3 gap-4">
      {TEAM.map((t,i)=>(<div key={i} className="bg-[#071033] p-4 rounded border border-gray-800 text-center">
        <div className={`w-12 h-12 mx-auto rounded-full ${t.color} flex items-center justify-center font-bold text-black`}>{t.name[0]}</div>
        <div className="mt-2 font-medium">{t.name}</div>
        <div className="text-sm text-gray-400">{t.role}</div>
        <button onClick={()=>setCmdAgent(t.name)} className="mt-3 text-xs px-3 py-1 bg-blue-600 rounded hover:bg-blue-700">Command</button>
      </div>))}
    </div>
    {commands.length>0 && <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Recent Commands</h3>
      <div className="space-y-1">
        {commands.slice(0,10).map(c=>(<div key={c.id} className="bg-[#071033] p-2 rounded border border-gray-800 text-sm flex justify-between">
          <div><span className="text-blue-400">@{c.agent_id}</span> <span className="text-gray-300">{c.command}</span></div>
          <span className={`text-xs px-2 py-0.5 rounded ${c.status==='pending'?'bg-yellow-900 text-yellow-300':c.status==='completed'?'bg-green-900 text-green-300':'bg-gray-800 text-gray-400'}`}>{c.status}</span>
        </div>))}
      </div>
    </div>}
  </div>)
}

/* ─── OFFICE (2D grid) ─── */
function OfficeView(){
  const rows=6,cols=8
  const agents=[{name:'Marcus',x:2,y:1,color:'bg-blue-500'},{name:'Dev',x:5,y:2,color:'bg-green-500'},{name:'Reva',x:1,y:3,color:'bg-purple-500'},{name:'Carlos',x:6,y:1,color:'bg-yellow-400'},{name:'Nina',x:3,y:4,color:'bg-pink-500'},{name:'Maya',x:7,y:5,color:'bg-cyan-400'}]
  return (<div>
    <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${cols}, 1fr)`}}>
      {Array.from({length:rows*cols}).map((_,i)=>{
        const x=i%cols, y=Math.floor(i/cols)
        const agent=agents.find(a=>a.x===x&&a.y===y)
        return (<div key={i} className="aspect-square bg-[#071033] rounded border border-gray-800 flex flex-col items-center justify-center text-xs">
          {agent?(<><span className={`w-4 h-4 rounded-full ${agent.color}`}/><span className="mt-1">{agent.name}</span></>):null}
        </div>)
      })}
    </div>
  </div>)
}
