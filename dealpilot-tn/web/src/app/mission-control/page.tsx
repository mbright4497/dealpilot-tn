"use client";
import React, { useEffect, useRef, useState } from "react";

// Utility formatters
const fmtTime = (s?: string) => s ? new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString() : '';
const relativeTime = (iso?: string) => {
  if(!iso) return '-';
  const then = new Date(iso).getTime();
  const diff = Math.round((Date.now()-then)/1000);
  if(diff<60) return `${diff}s ago`;
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};

export default function MissionControlCleanRewrite(){
  const [tab, setTab] = useState<string>('Overview');

  // All state default to arrays
  const [tasks, setTasks] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [office, setOffice] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [chat, setChat] = useState<any[]>([]);

  const [calModalOpen, setCalModalOpen] = useState(false);
  const [calForm, setCalForm] = useState({ title:'', start_time:'', end_time:'', assigned_agent:'', description:'' });

  const chatEnd = useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    // all fetches inside useEffect with try/catch
    (async ()=>{
      try{
        // tasks
        try{ const r = await fetch('/api/mission/tasks'); if(r.ok){ const d = await r.json(); const arr = Array.isArray(d)?d:(d?.tasks||[]); setTasks(arr);} }catch(e){console.error('tasks',e)}
        // calendar
        try{ const r = await fetch('/api/mission/calendar'); if(r.ok){ const d = await r.json(); const arr = Array.isArray(d)?d:(d?.events||[]); setCalendar(arr);} }catch(e){console.error('calendar',e)}
        // projects
        try{ const r = await fetch('/api/mission/projects'); if(r.ok){ const d = await r.json(); const arr = Array.isArray(d)?d:(d?.projects||[]); setProjects(arr);} }catch(e){console.error('projects',e)}
        // memories
        try{ const r = await fetch('/api/mission/memories'); if(r.ok){ const d = await r.json(); const arr = Array.isArray(d)?d:(d?.memories||[]); setMemories(arr);} }catch(e){console.error('memories',e)}
        // status + activity
        try{ const r = await fetch('/api/mission/status'); if(r.ok){ const d = await r.json(); const o = Array.isArray(d?.team)?d.team:(Array.isArray(d?.status)?d.status:[]); setOffice(o); const af = Array.isArray(d?.activity)?d.activity:(Array.isArray(d?.events)?d.events:[]); setActivity(af);} }catch(e){console.error('status',e)}
        // chat
        try{ const r = await fetch('/api/mission/chat'); if(r.ok){ const d = await r.json(); const arr = Array.isArray(d)?d:(d?.messages||[]); setChat(arr);} }catch(e){console.error('chat',e)}
      }catch(err){console.error('load-all',err)}
    })();

    const id = setInterval(async ()=>{
      try{ const r = await fetch('/api/mission/status'); if(r.ok){ const d = await r.json(); const o = Array.isArray(d?.team)?d.team:(Array.isArray(d?.status)?d.status:[]); setOffice(o); const af = Array.isArray(d?.activity)?d.activity:(Array.isArray(d?.events)?d.events:[]); setActivity(af);} }catch(e){console.error('poll',e)}
    },10000);

    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{ if(chatEnd.current) chatEnd.current.scrollIntoView({behavior:'smooth'}); },[chat]);

  // safe mapping helpers used in render
  const safeMap = (arr:any, fn:any) => Array.isArray(arr)? arr.map(fn) : null;

  // small group helper
  const groupByDate = (items:any[])=>{ const map:any={}; if(!Array.isArray(items)) return map; items.forEach(it=>{ const d = fmtDate(it?.start_time); (map[d]||(map[d]=[])).push(it); }); return map; };

  // simple add handlers (defensive)
  const addTask = async (e:React.FormEvent)=>{ e.preventDefault(); try{ const form = e.target as any; const title=form.title.value; const status=form.status.value; await fetch('/api/mission/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,status})}); // refresh
    try{ const r = await fetch('/api/mission/tasks'); if(r.ok){ const d = await r.json(); setTasks(Array.isArray(d)?d:(d?.tasks||[])); } }catch(e){} }catch(e){console.error(e)} };

  const submitCal = async (e:React.FormEvent)=>{ e.preventDefault(); try{ await fetch('/api/mission/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(calForm)}); setCalForm({ title:'', start_time:'', end_time:'', assigned_agent:'', description:'' }); setCalModalOpen(false); try{ const r=await fetch('/api/mission/calendar'); if(r.ok){ const d=await r.json(); setCalendar(Array.isArray(d)?d:(d?.events||[])); }}catch(e){} }catch(e){console.error(e)} };

  const sendChat = async ()=>{ try{ if(!chatInput?.trim()) return; await fetch('/api/mission/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:chatInput})}); setChatInput(''); try{ const r=await fetch('/api/mission/chat'); if(r.ok){ const d=await r.json(); setChat(Array.isArray(d)?d:(d?.messages||[])); }}catch(e){} }catch(e){console.error(e)} };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="mb-4">
        <div className="flex justify-between items-center">
          <div className="text-xl font-bold text-blue-400">Mission Control</div>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <div className="px-2 py-1 bg-green-700 rounded text-green-100">Tango Online</div>
            <div>{(Array.isArray(office)?office:[]).filter(a=>a?.status==='working').length}/7 agents active</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-300"> <span className="px-2 py-0.5 bg-yellow-700 rounded font-bold">TANGO</span> <span className="ml-3">Monitoring all systems</span></div>
      </header>

      <div className="flex">
        <aside className="w-48 pr-4">
          <div className="space-y-1">
            {['Overview','Tasks','Calendar','Projects','Memories','Office','Chat'].map(t=> (
              <button key={t} onClick={()=>setTab(t)} className={`w-full text-left px-3 py-2 rounded ${tab===t? 'bg-gray-800 text-white':'text-gray-400 hover:text-white'}`}>{t}</button>
            ))}
          </div>
        </aside>

        <main className="flex-1">
          {tab==='Overview' && <div><h2 className="text-lg font-semibold">Overview</h2><p className="text-gray-300">Summary</p></div>}

          {tab==='Tasks' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Tasks</h2>
              {['todo','in_progress','done'].map(col=> (
                <div key={col} className="mb-3">
                  <h3 className="font-bold">{col}</h3>
                  {(Array.isArray(tasks)?tasks:[]).filter(t=>t?.status===col).map(t=> <div key={t?.id}>{t?.title}</div>)}
                </div>
              ))}
              <form onSubmit={addTask} className="flex gap-2 mt-2"><input name="title" className="flex-1 p-2 bg-slate-800"/><select name="status" className="p-2 bg-slate-800"><option value="todo">todo</option><option value="in_progress">in_progress</option><option value="done">done</option></select><button className="px-3 py-2 bg-blue-600">Add</button></form>
            </div>
          )}

          {tab==='Calendar' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Calendar</h2>
              {Object.entries(groupByDate(Array.isArray(calendar)?calendar:[])).map(([d,evs])=> (
                <div key={d} className="mb-2"><div className="font-bold">{d}</div>{(Array.isArray(evs)?evs:[]).map((ev:any)=> <div key={ev?.id} className="p-2 bg-slate-800 rounded my-1 flex justify-between"><div><div className="font-medium">{ev?.title}</div><div className="text-sm text-gray-400">{ev?.all_day? 'All day' : `${fmtTime(ev?.start_time)} — ${fmtTime(ev?.end_time)}`}</div></div>{ev?.assigned_agent? <div className="px-2 py-1 bg-green-600 rounded">{ev.assigned_agent}</div>:null}</div>)}</div>
              ))}
              <button className="mt-2 px-3 py-1 bg-blue-600" onClick={()=>setCalModalOpen(true)}>+ New Event</button>

              {calModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white text-black p-4 rounded w-full max-w-md">
                    <h3 className="font-bold mb-2">New Event</h3>
                    <form onSubmit={submitCal} className="space-y-2">
                      <input placeholder="Title" className="w-full p-2 border" value={calForm.title} onChange={e=>setCalForm({...calForm,title:e.target.value})} />
                      <input type="datetime-local" className="w-full p-2 border" value={calForm.start_time} onChange={e=>setCalForm({...calForm,start_time:e.target.value})} />
                      <input type="datetime-local" className="w-full p-2 border" value={calForm.end_time} onChange={e=>setCalForm({...calForm,end_time:e.target.value})} />
                      <select className="w-full p-2 border" value={calForm.assigned_agent} onChange={e=>setCalForm({...calForm,assigned_agent:e.target.value})}><option value="">-- none --</option>{['Tango','Marcus','Rayno','Reva','Carlos','Nina','Maya'].map(a=> <option key={a} value={a}>{a}</option>)}</select>
                      <textarea className="w-full p-2 border" value={calForm.description} onChange={e=>setCalForm({...calForm,description:e.target.value})} />
                      <div className="flex justify-end gap-2"><button type="button" onClick={()=>setCalModalOpen(false)} className="px-2 py-1 border">Cancel</button><button type="submit" className="px-3 py-1 bg-blue-600 text-white">Create</button></div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {tab==='Projects' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Projects</h2>
              {(Array.isArray(projects)?projects:[]).map((p:any)=> <div key={p?.id} className="p-2 bg-slate-800 rounded mb-2 flex justify-between"><div><div className="font-medium">{p?.title}</div><div className="text-sm text-gray-400">{p?.description}</div></div>{p?.owner_agent? <div className="px-2 py-1 bg-purple-700 rounded">{p.owner_agent}</div>:null}</div>)}
            </div>
          )}

          {tab==='Memories' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Memories</h2>
              {(Array.isArray(memories)?memories:[]).map(m=> <div key={m?.id} className="p-2 bg-slate-800 rounded mb-2"><div className="text-xs text-gray-400">{m?.date}</div><div>{m?.text}</div></div>)}
            </div>
          )}

          {tab==='Office' && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Office</h2>
              {(Array.isArray(office)?office:[]).map(a=> <div key={a?.id || a?.name} className={`p-3 rounded mb-2 ${a?.status==='working'? 'border-2 border-green-500':'border border-slate-800'} bg-slate-800`}><div className="flex justify-between"><div><div className="font-semibold">{a?.name}</div><div className="text-sm text-gray-400">{a?.role}</div>{a?.current_task && <div className="text-sm text-gray-300">Current: {a.current_task}</div>}</div><div className="text-xs text-gray-400">{relativeTime(a?.last_heartbeat)}</div></div></div>)}
            </div>
          )}

          {tab==='Chat' && (
            <div className="flex flex-col" style={{height:'60vh'}}>
              <h2 className="text-lg font-semibold mb-2">Chat</h2>
              <div className="flex-1 overflow-auto bg-slate-800 p-4 rounded">{(Array.isArray(chat)?chat:[]).map((m:any,idx:number)=> <div key={idx} className={`mb-2 ${(m?.sender==='Tango')? 'text-blue-200':'text-gray-200'}`}><div className="text-xs text-gray-400">{m?.sender || 'User'} • {fmtTime(m?.created_at)}</div><div>{m?.text}</div></div>)}<div ref={chatEnd} /></div>
              <div className="mt-3 flex gap-2"><input className="flex-1 p-2 bg-slate-800 rounded" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} /><button className="px-3 py-2 bg-blue-600 rounded" onClick={sendChat}>Send</button></div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
