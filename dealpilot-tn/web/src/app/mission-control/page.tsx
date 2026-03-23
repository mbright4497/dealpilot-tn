"use client";
import React, { useEffect, useRef, useState } from "react";

const AGENT_ORDER = [
  { name: 'Tango', role: 'Leader / Orchestrator', piece: '\u2654', coord: 'e1' },
  { name: 'Marcus', role: 'COO', piece: '\u2655', coord: 'd1' },
  { name: 'Rayno', role: 'Software Engineer', piece: '\u2657', coord: 'f1' },
  { name: 'Reva', role: 'Transaction Coordinator', piece: '\u2656', coord: 'a1' },
  { name: 'Carlos', role: 'Lead Gen & CRM Manager', piece: '\u2658', coord: 'b1' },
  { name: 'Nina', role: 'Content & Marketing Director', piece: '\u2659', coord: 'd2' },
  { name: 'Maya', role: 'Client Success & Booking', piece: '\u2659', coord: 'e2' }
];

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = [8,7,6,5,4,3,2,1];

const fmtTime = (s?:string)=> s? new Date(s).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
const relativeTime = (iso?:string)=>{ if(!iso) return '-'; const diff=Math.round((Date.now()-new Date(iso).getTime())/1000); if(diff<60) return `${diff}s ago`; if(diff<3600) return `${Math.floor(diff/60)}m ago`; if(diff<86400) return `${Math.floor(diff/3600)}h ago`; return `${Math.floor(diff/86400)}d ago`; };

export default function MissionControl(){
  const [tab, setTab] = useState('Overview');

  // data
  const [office, setOffice] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // board modal
  const [selectedAgent, setSelectedAgent] = useState<any|null>(null);
  const [tapMessage, setTapMessage] = useState('');
  const [tapSending, setTapSending] = useState(false);
  const [tapResult, setTapResult] = useState<string|null>(null);

  // chat
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [chatThread, setChatThread] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(()=>{ // fetch minimal data for board + tasks
    (async ()=>{
      try{
        try{ const r = await fetch('/api/mission/status'); if(r.ok){ const d = await r.json(); setOffice(Array.isArray(d?.team)?d.team:(d?.status||[])); }}catch(e){console.error(e)}
        try{ const r = await fetch('/api/mission/tasks'); if(r.ok){ const d = await r.json(); setTasks(Array.isArray(d)?d:(d?.tasks||[])); }}catch(e){}
      }catch(e){console.error(e)}
    })();
  },[]);

  // helper to find agent data from office state
  const findAgent = (name:string)=> (Array.isArray(office)?office:[]).find(a=>a?.name===name) || null;

  // tap shoulder -> post to /api/mission/chat with {agent, message}
  const tapAgent = async (agentName:string)=>{
    if(!tapMessage.trim()) return setTapResult('Type a message first');
    setTapSending(true); setTapResult(null);
    try{
      const res = await fetch('/api/mission/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({sender:'Tango UI', text: tapMessage, agent: agentName}) });
      if(res.ok){ setTapResult('Sent'); setTapMessage(''); }
      else { const t = await res.text().catch(()=>null); setTapResult('Error: '+(t||res.status)); }
    }catch(e:any){ setTapResult('Error: '+(e?.message||String(e))); }
    setTapSending(false);
  };

  // chat: load thread for selected agent on demand
  const loadThread = async (agentName:string)=>{
    setChatThread([]);
    try{
      const url = '/api/mission/chat?agent=' + encodeURIComponent(agentName);
      const r = await fetch(url);
      if(r.ok){ const d = await r.json(); const arr = Array.isArray(d)?d:(d?.messages||[]); setChatThread(arr); }
    }catch(e){ console.error(e); setChatThread([]); }
  };
  const sendChatMessage = async ()=>{
    if(!chatAgent || !chatInput.trim()) return;
    try{
      await fetch('/api/mission/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({sender:'You', text: chatInput, agent: chatAgent}) });
      setChatInput(''); await loadThread(chatAgent);
    }catch(e){ console.error(e); }
  };

  // Board render helpers
  const getAgentAt = (coord:string)=>{
    const placement:any = Object.fromEntries(AGENT_ORDER.map(a=>[a.coord, a.name]));
    const name = placement[coord];
    if(!name) return null;
    return { name, ...findAgent(name), piece: AGENT_ORDER.find(a=>a.name===name)?.piece };
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={color: '#f59e0b'}>Mission Control</h1>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-amber-600 rounded text-black">Tango Online</div>
          <div className="text-sm text-gray-200">{(Array.isArray(office)?office:[]).filter(a=>a?.status==='working').length}/7 active</div>
        </div>
      </header>

      <div className="flex gap-6">
        {/* Left nav */}
        <nav className="w-48">
          {['Overview','Tasks','Calendar','Projects','Memories','Office','Chat'].map(t=> (
            <button key={t} onClick={()=>setTab(t)} className={`w-full text-left px-3 py-2 rounded mb-1 ${tab===t? 'border-l-2 border-amber-500 bg-slate-800':''}`}>{t}</button>
          ))}
        </nav>

        <main className="flex-1">
          {/* Board Section */}
          {tab==='Overview' && (
            <section>
              <h2 className="text-xl font-bold text-amber-300 mb-3">The Board</h2>
              <div className="mb-3 text-sm text-gray-300">An 8x8 view of agent positions and status</div>
              <div className="border-4 border-amber-800 rounded shadow-2xl inline-block">
                <div style={{width: 72*8}} className="grid grid-cols-8">
                  {RANKS.map(rank=> (
                    FILES.map((file,i)=>{
                      const coord = `${file}${rank}`;
                      const light = ((rank + i) %2 ===0);
                      const bg = light ? 'bg-amber-100' : 'bg-amber-900';
                      const agent = getAgentAt(coord);
                      return (
                        <div key={coord} className={`${bg} p-0`} style={{width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                          {agent ? (
                            <button onClick={()=>setSelectedAgent(agent)} className="flex flex-col items-center justify-center w-full h-full" title={`${agent.name} - ${agent.role}`}>
                              <div className={`text-4xl text-white`} style={{textShadow:'0 2px 6px rgba(0,0,0,0.6)'}}>{agent.piece}</div>
                              <div className="text-xs font-bold text-white mt-1">{agent.name}</div>
                              <span className={`absolute top-1 right-1 w-3 h-3 rounded-full ${agent?.status==='working'?'bg-green-500':agent?.status==='idle'?'bg-yellow-400':'bg-gray-400'}`}></span>
                            </button>
                          ) : null}
                        </div>
                      );
                    })
                  ))}
                </div>
                {/* file labels below */}
                <div className="flex mt-2 justify-between px-1 text-amber-800">
                  {FILES.map(f=> <div key={f} style={{width:72,textAlign:'center'}}>{f}</div>)}
                </div>
              </div>
            </section>
          )}

          {/* Chat tab - full UI */}
          {tab==='Chat' && (
            <section className="flex gap-4">
              <aside className="w-48 bg-slate-800 p-3 rounded">
                <h3 className="text-sm font-bold mb-2">Agents</h3>
                {(Array.isArray(office)?office:[]).map((a:any)=> (
                  <button key={a?.name} onClick={()=>{ setChatAgent(a?.name); loadThread(a?.name); setTab('Chat'); }} className="w-full text-left py-2 px-2 mb-1 rounded hover:bg-slate-700 flex items-center justify-between">
                    <span>{a?.name}</span>
                    <span className={`w-3 h-3 rounded-full ${a?.status==='working'?'bg-green-500':a?.status==='idle'?'bg-yellow-400':'bg-gray-400'}`}></span>
                  </button>
                ))}
              </aside>

              <div className="flex-1 bg-slate-800 rounded p-3 flex flex-col">
                <div className="flex-1 overflow-auto mb-3">
                  <h3 className="font-bold">{chatAgent || 'Select an agent'}</h3>
                  {(Array.isArray(chatThread)?chatThread:[]).map((m:any,idx:number)=> (
                    <div key={idx} className="mb-2">
                      <div className="text-xs text-gray-400">{m?.sender} • {fmtTime(m?.created_at)}</div>
                      <div>{m?.text}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input className="flex-1 p-2 bg-slate-700 rounded" value={chatInput} onChange={e=>setChatInput(e.target.value)} />
                  <button className="px-3 py-2 bg-blue-600 rounded" onClick={sendChatMessage}>Send</button>
                </div>
              </div>
            </section>
          )}

          {/* Modal for Tap on shoulder */}
          {selectedAgent && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-slate-900 p-4 rounded w-full max-w-md">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">{selectedAgent.name}</h3>
                  <button onClick={()=>setSelectedAgent(null)}>X</button>
                </div>
                <div className="text-sm text-gray-300 mb-2">{selectedAgent.role}</div>
                <div className="text-sm text-gray-400 mb-2">Status: {selectedAgent.status}</div>
                <div className="text-xs text-gray-500 mb-2">Last active: {selectedAgent?.last_heartbeat?relativeTime(selectedAgent.last_heartbeat):'N/A'}</div>
                <textarea className="w-full p-2 bg-slate-800 mb-2" value={tapMessage} onChange={e=>setTapMessage(e.target.value)} placeholder={`Send a message to ${selectedAgent.name}...`}></textarea>
                <div className="flex justify-end gap-2">
                  <button className="px-3 py-1 border" onClick={()=>setSelectedAgent(null)}>Close</button>
                  <button className="px-3 py-1 bg-amber-600 text-black" onClick={()=>tapAgent(selectedAgent.name)} disabled={tapSending}>Tap</button>
                </div>
                {tapResult && <div className="mt-2 text-sm text-gray-300">{tapResult}</div>}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
