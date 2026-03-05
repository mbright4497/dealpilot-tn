'use client'
import React, {useState, useEffect, useRef} from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { createChecklistInstance, checklistProgress } from '@/lib/tc-checklist'
import ContractUpload from './ContractUpload'
import DocumentChecklist from './DocumentChecklist'

type Contact = { role:string, name:string, company?:string, phone?:string, email?:string }
type TimelineEvent = { id:string, title:string, date?:string, ts?:number, type?:string, note?:string }
type Transaction = { id:number, address:string, client:string, type:string, status:string, binding?:string, closing?:string, contacts?:Contact[], notes?:string, timeline?:TimelineEvent[] }

export default function TransactionDetail({transaction, onBack, onUpdateContacts}:{transaction:Transaction,onBack:()=>void,onUpdateContacts?:(txId:number,contacts:Contact[])=>void}){
  // mode: mission (default), dealroom, timeline
  const [mode,setMode] = useState<'mission'|'dealroom'|'timeline'|'documents'>('mission')
  const [remote, setRemote] = useState<any>(null)
  const [mergedTx, setMergedTx] = useState<Transaction>(transaction)
  const [checklist,setChecklist]=useState(()=> createChecklistInstance())
  const [chatMessages,setChatMessages]=useState<any[]>([{from:'system',text:`Transaction: ${transaction.address} (${transaction.client})`}])
  const [input,setInput]=useState('')
  const [localContacts,setLocalContacts]=useState<Contact[]>(transaction.contacts || [])
  const [showAddContact,setShowAddContact]=useState(false)
  const [aiFilling,setAiFilling]=useState<Record<string,boolean>>({})
  const [newContact,setNewContact]=useState<Contact>({role:'',name:'',company:'',phone:'',email:''})
  const [contractData, setContractData] = useState<any>(()=>{ try{ const raw = localStorage.getItem(`dp-contract-${transaction.id}`); if(raw) return JSON.parse(raw) }catch(e){} return null })

  // documents via documents API (db + storage)
  const supabase = createBrowserClient()
  const [docs,setDocs]=useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadDocs() {
      try {
        const res = await fetch(`/api/documents/${transaction.id}`)
        if (!mounted) return
        if (res.ok) {
          const j = await res.json()
          setDocs(j || [])
        }
      } catch (e) {
        // ignore
      }
    }
    loadDocs()
    return ()=>{ mounted = false }
  }, [transaction.id])

  const handleUpload = async (file: File) => {
    if (!file) return
    const duplicate = docs.find(d => d.name === file.name)
    if (duplicate) {
      alert('A file with this name already exists.')
      return
    }
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/documents/${transaction.id}`, { method: 'POST', body: fd })
      if (!res.ok) {
        alert('Upload failed')
        return
      }
      const uploaded = await res.json()
      // attempt classification
      try{
        const clf = await fetch('/api/documents/classify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ filename: uploaded?.name || file.name, text_preview: '' }) })
        if (clf.ok){
          const cj = await clf.json()
          // update document row with rf_number/category if found
          if (cj && cj.rf_number){
            await fetch('/api/documents/update', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: uploaded.id, rf_number: cj.rf_number, category: cj.category, name: uploaded.name }) })
            // auto-check checklist item if matches
            const rfKey = (cj.rf_number||'').toString().toLowerCase()
            const idx = checklist.findIndex((it:any)=> (it.key||'').toString().toLowerCase() === rfKey)
            if (idx !== -1){ checklist[idx].status = 'done'; setChecklist([...checklist]) }
          }
        }
      }catch(e){/* ignore */}

      // refresh docs
      const refresh = await fetch(`/api/documents/${transaction.id}`)
      if (refresh.ok){ const rj = await refresh.json(); setDocs(rj || []) }
    } finally {
      setUploading(false)
    }
  }


  // next steps persistent checkboxes
  const [nextSteps,setNextSteps] = useState<{contractReceived:boolean, earnestVerified:boolean, inspectionsScheduled:boolean}>(()=>{
    try{ const raw = localStorage.getItem(`dp-nextsteps-${transaction.id}`); if(raw) return JSON.parse(raw) }catch(e){}
    return { contractReceived:false, earnestVerified:false, inspectionsScheduled:false }
  })
  useEffect(()=>{ try{ localStorage.setItem(`dp-nextsteps-${transaction.id}`, JSON.stringify(nextSteps)) }catch(e){} },[nextSteps, transaction.id])

  // fetch richer deal-state on mount and merge
  useEffect(()=>{
    let mounted = true
    async function load(){
      try{
        const res = await fetch(`/api/deal-state/${transaction.id}`)
        if(!mounted) return
        if(res.ok){
          const j = await res.json()
          setRemote(j)
          // merge: prefer remote fields when present
          const merged = { ...transaction, ...(j || {}) }
          setMergedTx(merged)
          if(j.contacts) setLocalContacts(j.contacts)
        }
      }catch(err){
        // ignore - keep passed transaction
        console.error('deal-state fetch failed',err)
      }
    }
    load()
    return ()=>{ mounted=false }
  },[transaction.id])

  // helpers for dates and formatting
  const fmtDate = (d?:string|Date|null)=>{ if(!d) return '—'; try{ const dt = typeof d==='string'? new Date(d): d; return isNaN(dt.getTime())? '—' : dt.toLocaleDateString() }catch(e){ return '—' } }
  const daysUntil = (d?:string|Date|null)=>{ if(!d) return null; const t = new Date(d).getTime(); if(isNaN(t)) return null; return Math.ceil((t-Date.now())/(1000*60*60*24)) }

  function genDeadlinesFromRemote(){
    const b = mergedTx.binding ? new Date(mergedTx.binding) : null
    const closing = (mergedTx as any).closing_date || mergedTx.closing ? new Date((mergedTx as any).closing_date || mergedTx.closing) : null
    if(!b) return []
    const add = (d:Date, days:number)=>{ const r=new Date(d); r.setDate(r.getDate()+days); return r }
    const arr = [] as any[]
    if((mergedTx as any).inspection_period_days!=null){ arr.push({key:'inspection_end', title:'Inspection Ends', date: add(b, Number((mergedTx as any).inspection_period_days))}) }
    if((mergedTx as any).earnest_money) arr.push({key:'earnest', title:'Earnest Money', date: b})
    if((mergedTx as any).appraisal_contingency) arr.push({key:'appraisal', title:'Appraisal Contingency', date: add(b,21)})
    if(closing) arr.push({key:'closing', title:'Closing Date', date: closing})
    return arr
  }

  const deadlines = genDeadlinesFromRemote()

  function combinedProgress(){
    const base = checklistProgress(checklist) || 0
    const extra = (nextSteps.contractReceived?33:0) + (nextSteps.earnestVerified?33:0) + (nextSteps.inspectionsScheduled?34:0)
    const total = Math.min(100, Math.round((base*0.7) + (extra*0.3)))
    return total
  }

  const stageFromProgress = (p:number)=>{
        if(transaction?.status === 'Closed') return 'Closed'
    if(p < 5) return 'New'
    if(p < 30) return 'Under Contract'
    if(p < 55) return 'Inspection'
    if(p < 80) return 'Appraisal'
    if(p < 99) return 'Clear to Close'
    return 'Closed'
  }

  // timeline events: prefer remote.timeline else build from docs/deadlines
  const timelineEvents:TimelineEvent[] = React.useMemo(()=>{
    const remoteEvents:TimelineEvent[] = (remote && remote.timeline) ? remote.timeline.map((e:any)=>({ id: e.id||String(e.ts||Math.random()), title: e.title||e.name||e.event, date: e.date, ts: e.ts, type: e.type, note: e.note })) : []
    const auto = (deadlines||[]).map(d=>({ id:d.key, title:d.title, date: d.date ? d.date.toISOString() : undefined, type:'deadline' }))
    const combined = [...(remoteEvents||[]), ...auto]
    // sort by date ascending
    return combined.filter(e=>e.date).sort((a,b)=> new Date(a.date!).getTime() - new Date(b.date!).getTime())
  },[remote, mergedTx, docs])

  // documentsByKey memo (Phase 21) - placed BEFORE return
  const documentsByKey = React.useMemo(() => {
    const m: Record<string, any> = {}
    ;(docs || []).forEach((d: any) => {
      const key = (d.classification || d.rf_number || d.key || '').toString()
      if (!key) return
      m[key] = {
        key,
        status: (d.doc_status || d.status || d.status_label || 'uploaded'),
        fileName: d.file_name || d.name || d.filename || '',
        uploadedAt: d.uploaded_at || d.created_at || null,
      }
    })
    return m
  }, [docs])

  // priorities state
  const [priorities, setPriorities] = React.useState<any[]>([])
  React.useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch(`/api/deal-priorities/${transaction.id}`)
        if(!mounted) return
        if(res.ok){
          const j = await res.json()
          // sort by urgency: high -> medium -> low
          const order = { high: 0, medium: 1, low: 2 }
          if(Array.isArray(j)){
            j.sort((a:any,b:any)=> (order[a.urgency]||3) - (order[b.urgency]||3))
            setPriorities(j)
          }
        }
      }catch(e){ /* ignore */ }
    })();
    return ()=>{ mounted=false }
  },[transaction.id])

  // file inputs helper (kept from previous implementation)
  const fileInputsRef = useRef<Record<string,HTMLInputElement|null>>({} as any)
  const ensureInput = (cat:string)=>{
    if(!fileInputsRef.current[cat]){
      const el = document.createElement('input')
      el.type = 'file'
      el.onchange = (e:any)=>{
        const f = e.target.files && e.target.files[0]
        if(!f) return
        const meta = { name: f.name, ts: Date.now() }
        setDocs(prev=>({ ...prev, [cat]: [ ...(prev[cat]||[]), meta ] }))
      }
      fileInputsRef.current[cat] = el
    }
    return fileInputsRef.current[cat]
  }

  // reuse functions from previous component for AI assistant and contacts
  async function sendAIMessage(text:string){
    const user = { role:'user', content: text }
    setChatMessages(m=>[...m, {from:'user', text}])
    try{
      const ctx = { id: mergedTx.id, address: mergedTx.address, client: mergedTx.client, type: mergedTx.type, status: mergedTx.status, binding: mergedTx.binding, closing: (mergedTx as any).closing_date || mergedTx.closing, contacts: (localContacts||[]).map(c=>({role:c.role,name:c.name})), notes: mergedTx.notes }
      const res = await fetch('/api/ai/chat', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ messages:[user], style:'friendly-tn', transaction: ctx }) })
      const j = await res.json()
      const reply = j.reply || j.message || j.choices?.[0]?.message?.content || 'Sorry, no response.'
      setChatMessages(m=>[...m, {from:'assistant', text: reply}])
    }catch(e:any){
      setChatMessages(m=>[...m, {from:'assistant', text: 'Error contacting AI: '+String(e)}])
    }
  }

  function addContact(){
    if(!newContact.name||!newContact.role) return
    const updated = [...localContacts, {...newContact}]
    setLocalContacts(updated)
    if(onUpdateContacts) onUpdateContacts(transaction.id, updated)
    setNewContact({role:'',name:'',company:'',phone:'',email:''})
    setShowAddContact(false)
  }
  function removeContact(idx:number){ const updated = localContacts.filter((_,i)=>i!==idx); setLocalContacts(updated); if(onUpdateContacts) onUpdateContacts(transaction.id, updated) }

  // split timeline into past / upcoming
  const now = Date.now()
  const past = timelineEvents.filter(e=> new Date(e.date!).getTime() <= now)
  const upcoming = timelineEvents.filter(e=> new Date(e.date!).getTime() > now)

  // basic color / integrity alert (legacy kept for fallbacks)
  const rawIntegrity = (remote && remote.lifecycle_integrity) || (mergedTx as any).lifecycle_integrity || null
  let integrity = 100
  if (typeof rawIntegrity === 'number') {
    integrity = rawIntegrity
  } else if (rawIntegrity && typeof rawIntegrity === 'object') {
    if (rawIntegrity.valid === true) integrity = 100
    else if (Array.isArray(rawIntegrity.errors) && rawIntegrity.errors.length > 0) integrity = 40
    else integrity = 75
  }
  const integrityColor = integrity < 60 ? 'bg-red-600' : integrity < 85 ? 'bg-yellow-500' : 'bg-green-500'

  // deal health state
  const [health, setHealth] = React.useState<{ status: string, score: number, signals: any[] } | null>(null)
  React.useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch(`/api/deal-health/${transaction.id}`)
        if(!mounted) return
        if(res.ok){ const j = await res.json(); setHealth(j) }
      }catch(e){ }
    })()
    return ()=>{ mounted=false }
  },[transaction.id])

  // deal brief state
  const [brief, setBrief] = React.useState<{greeting:string,summary:string,primary_focus:string}|null>(null)
  React.useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch(`/api/deal-brief/${transaction.id}`)
        if(!mounted) return
        if(res.ok){ const j = await res.json(); setBrief(j) }
      }catch(e){ }
    })()
    return ()=>{ mounted=false }
  },[transaction.id])

  // deal deadlines state (Phase 11)
  const [dealDeadlines, setDealDeadlines] = React.useState<any[]>([])
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try{
        const res = await fetch(`/api/deal-deadlines/${transaction.id}`)
        if(!mounted) return
        if(res.ok){
          const j = await res.json()
          setDealDeadlines(j.deadlines || j.all_deadlines || [])
        }
      }catch(e){ }
    })()
    return () => { mounted = false }
  }, [transaction.id])

  return (
    <div className="p-4 rounded-lg bg-gray-900 text-white min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={onBack} className="text-sm text-orange-300">← Back</button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold mt-1">{mergedTx.address}</h2>
            <span className={`px-2 py-1 rounded text-sm font-semibold ${health?.status==='healthy' ? 'bg-green-50 text-green-700 border border-green-200' : health?.status==='attention' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : health?.status==='at_risk' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-800 text-gray-300'}`}>{health ? (transaction?.status === 'Closed' ? 'Closed – Complete' : health.status==='healthy'? 'Healthy' : health.status==='attention'? 'Needs Attention' : 'At Risk') : 'Loading...'}</span>
          </div>
          <div className="text-sm text-gray-300 font-semibold">Client: {mergedTx.client} • Status: <span className={`px-2 py-1 rounded ${mergedTx.status==='Active'?'bg-green-800 text-green-100':'bg-gray-800 text-gray-200'}`}>{mergedTx.status}</span></div>
        </div>
        <div className="text-right text-sm text-gray-300">
          <div>Binding: <span className="font-semibold">{fmtDate(mergedTx.binding)}</span></div>
          <div>Closing: <span className="font-semibold">{fmtDate((mergedTx as any).closing_date || mergedTx.closing)}</span></div>
        </div>
      </div>

      {/* pill toggles */}
      <div className="mb-4">
        <div className="inline-flex bg-gray-800 rounded-full p-1">
          <button onClick={()=>setMode('mission')} className={`px-4 py-1 rounded-full ${mode==='mission' ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300'}`}>Mission Control</button>
          <button onClick={()=>setMode('dealroom')} className={`px-4 py-1 rounded-full ${mode==='dealroom' ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300'}`}>Deal Room</button>
          <button onClick={()=>setMode('timeline')} className={`px-4 py-1 rounded-full ${mode==='timeline' ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300'}`}>Timeline</button>
          <button onClick={()=>setMode('documents')} className={`px-4 py-1 rounded-full ${mode==='documents' ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300'}`}>Documents</button>
        </div>
      </div>

      {/* Mission Control */}
      {mode==='mission' && (
        <div>
          {/* cockpit header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-300">Mission Cockpit</div>
              <div className="text-xl font-bold">{mergedTx.address} — {mergedTx.client}</div>
              <div className="text-sm text-gray-400">Stage: <span className="font-semibold">{transaction?.status === 'Closed' ? 'Closed' : stageFromProgress(combinedProgress())}</span> • {transaction?.status === 'Closed' ? 100 : combinedProgress()}% complete</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div className="text-xs text-gray-300">Deal Health</div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${health?.status==='healthy' ? 'bg-green-500' : health?.status==='attention' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                  <div className="font-semibold">{health ? (transaction?.status === 'Closed' ? 'Closed – Complete' : health.status==='healthy'? 'Healthy' : health.status==='attention'? 'Needs Attention' : 'At Risk') : 'Loading...'}</div>
                  <div className="text-xs text-gray-300 ml-2">{health ? health.score + '%' : ''}</div>
                </div>
                {/* existing signals (structured) */}
                <div className="text-xs text-gray-400 mt-1">
                  {health && health.signals && health.signals.length>0 ? health.signals.map((s:any,i:number)=>(<div key={i} className="text-xs">• {s.label} <span className="text-gray-500">({s.impact})</span></div>)) : <div className="text-xs text-gray-500">No signals</div>}
                </div>
                {/* Phase 16: risk signals (string list) */}
                {health?.signals && Array.isArray(health.signals) && health.signals.length > 0 && transaction?.status !== 'Closed' && (
                  <div className="mt-2 space-y-1">
                    {health.signals.map((s: any, i: number) => (
                      <div key={i} className="text-xs text-red-400">• {typeof s === 'string' ? s : (s.label || JSON.stringify(s))}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{ const blob = new Blob([JSON.stringify({transaction: mergedTx, contacts: localContacts, contractData}, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`deal-${transaction.id}-export.json`; a.click(); URL.revokeObjectURL(url); }} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded">Export</button>
                <button onClick={()=>setMode('dealroom')} className="px-3 py-2 bg-orange-500 rounded">Open Deal Room</button>
              </div>
            </div>
          </div>

          {/* pulse strip */}
          <div className="flex gap-2 overflow-x-auto mb-4">
            {deadlines.map((d:any,i:number)=>{
              const days = d.date? Math.ceil((new Date(d.date).getTime()-Date.now())/(1000*60*60*24)) : null
              const urgent = days!==null && days<=3
              return (
                <div key={i} className={`flex-none px-3 py-2 rounded ${urgent ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                  <div className="text-xs text-gray-200">{d.title}</div>
                  <div className="font-semibold">{fmtDate(d.date)}</div>
                  <div className="text-xs text-gray-400">{days!==null? `${days}d` : 'TBD'}</div>
                </div>
              )
            })}
            <div className="flex-none px-3 py-2 rounded bg-gray-800 text-gray-300">
              <div className="text-xs">Progress</div>
              <div className="font-semibold">{combinedProgress()}%</div>
            </div>
          </div>

          {/* middle section: Today's Priorities (60%) and Deal Vitals (40%) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="md:col-span-3 bg-gray-800 p-4 rounded">
              {/* Deal Brief Card (top) */}
              <div className="mb-3 p-3 bg-gray-900 rounded">
                <div className="text-xs text-gray-400">{brief?.greeting || 'Good morning.'}</div>
                <div className="mt-1 text-sm">{brief?.summary || 'Loading brief...'}</div>
                {brief?.primary_focus && <div className="mt-2 font-semibold">{brief.primary_focus}</div>}
              </div>
              <h3 className="text-lg font-semibold mb-2">Today's Priorities</h3>
              <div className="space-y-3">
                {/* priorities fetched from server */}
                {priorities && priorities.length>0 ? priorities.slice(0,5).map((p:any,i:number)=> (
                  <div key={i} className="p-3 bg-gray-700 rounded">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-sm text-gray-300">{p.reason}</div>
                        <div className="mt-1 text-xs italic text-gray-400">{p.consequence}</div>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${p.urgency==='high'? 'bg-red-600 text-white': p.urgency==='medium'? 'bg-yellow-500 text-black':'bg-green-600 text-white'}`}>{p.urgency.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-3 bg-gray-700 rounded">No active priorities.</div>
                )}

                <div className="flex gap-2 mt-2">
                  <button onClick={()=>setMode('dealroom')} className="px-3 py-2 bg-orange-500 rounded">Open Deal Room</button>
                  <button onClick={()=>setMode('timeline')} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded">View Timeline</button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-gray-800 p-4 rounded">
              <h3 className="text-lg font-semibold mb-2">Deal Vitals</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div>Earnest: <strong className="text-white">{ (remote && remote.earnest_money) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(typeof remote.earnest_money === 'object' ? remote.earnest_money.amount : remote.earnest_money) : (contractData?.earnest_money? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(contractData.earnest_money) : '—') }</strong></div>
                <div>Financing: <strong className="text-white">{(remote && remote.financing && (typeof remote.financing === 'string' ? remote.financing : remote.financing.type)) || contractData?.loan_type || '—'}</strong></div>
                <div>Inspection Ends: <strong className="text-white">{fmtDate((remote && remote.inspection_end_date) || undefined)}</strong></div>
                <div>Appraisal: <strong className="text-white">{(remote && remote.appraisal_contingency) ? 'Yes' : '—'}</strong></div>
                <div>Closing: <strong className="text-white">{fmtDate((remote && remote.closing_date) || mergedTx.closing)}</strong></div>
                <div>Possession: <strong className="text-white">{fmtDate((remote && remote.possession_date) || undefined)}</strong></div>
              </div>

              {/* lifecycle stepper simplified */}
              <div className="mt-4">
                <div className="text-xs text-gray-400">Lifecycle</div>
                <div className="flex gap-2 mt-2">
                  {['New','Under Contract','Inspection','Appraisal','Clear to Close','Closed'].map((s,i)=> (
                    <div key={s} className={`flex-1 text-center py-1 rounded text-xs ${i <= (transaction?.status==='Closed' ? 5 : Math.floor(combinedProgress()/20)) ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>{s}</div>
                  ))}
                </div>
              </div>

              {/* integrity alert */}
              {integrity < 70 && (
                <div className="mt-3 p-2 rounded bg-red-700 text-sm">Integrity alert: lifecycle integrity at {integrity}%. Review milestones.</div>
              )}
            </div>
          </div>

          {/* Key Deadlines - Phase 11 */}
          {dealDeadlines.length > 0 && (
            <div className="bg-gray-800 p-4 rounded mb-4">
              <h3 className="text-lg font-semibold mb-2">Key Deadlines</h3>
              <div className="space-y-2">
                {dealDeadlines.slice(0,6).map((d: any, i: number) => {
                  const isOverdue = d.status === 'overdue'
                  const isToday = d.status === 'today'
                  const isWarn = !isOverdue && !isToday && (d.days_remaining != null && d.days_remaining <= 3)
                  const dotColor = isOverdue || isToday ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-green-500'
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{d.label}</div>
                      </div>
                      <div className="text-xs text-gray-400">{isOverdue ? `${Math.abs(d.days_remaining)}d overdue` : isToday ? 'Today' : d.days_remaining != null ? `${d.days_remaining}d` : d.date}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Documents mode: DocumentChecklist integration */}
      {mode==='documents' && (
        <div>
          <DocumentChecklist
            context={{ state: 'TN', side: transaction.type === 'seller' ? 'seller' : 'buyer', conditions: {} }}
            documentsByKey={documentsByKey}
            onUpload={(docDef) => {
              const input = ensureInput('doc-upload');
              if(input){
                input.onchange = async (e: any) => {
                  const f = e.target.files && e.target.files[0];
                  if(!f) return;
                  try{
                    const fd = new FormData();
                    fd.append('file', f);
                    fd.append('transaction_id', String(transaction.id));
                    fd.append('classification', String(docDef.key));
                    const res = await fetch('/api/docs/upload', { method: 'POST', body: fd });
                    if(res.ok){
                      const j = await res.json();
                      // refresh docs
                      const refresh = await fetch('/api/documents/' + transaction.id);
                      if(refresh.ok){ const rj = await refresh.json(); setDocs(rj || []); }
                    } else {
                      console.error('Upload failed', await res.text())
                      alert('Upload failed')
                    }
                  }catch(err){ console.error(err); alert('Upload error') }
                };
                input.click();
              }
            }}
            onMarkSigned={async (docKey) => {
              try{
                const found = (docs||[]).find((d:any)=> ((d.classification||d.rf_number||d.key||'').toString() === docKey.toString()));
                if(!found) return;
                const res = await fetch('/api/docs/status', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ documentId: found.id, status: 'signed' }) });
                if(res.ok){
                  const refresh = await fetch('/api/documents/' + transaction.id);
                  if(refresh.ok){
                    const rj = await refresh.json();
                    setDocs(rj || []);
                  }
                }
              } catch(e){
                console.error(e);
              }
            }}
          />
        </div>
      )}

      {/* Deal Room: reuse previous tabs (contract, documents, contacts, checklist, forms, assistant) */}
      {mode==='dealroom' && (
        <div>
          <div className="mb-3 text-sm text-gray-300">Deal Room — core deal artifacts and workflows</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="mb-4">
                <ContractUpload dealId={String(transaction.id)} onSave={(data)=>setContractData(data)} onDelete={()=>setContractData(null)} />
              </div>

              <div className="p-4 bg-gray-800 rounded mb-4">
                <h4 className="font-semibold mb-2">Documents</h4>
                <div className="mb-2 text-sm text-gray-400">Drag & drop files anywhere to upload</div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <input type="file" onChange={(e)=>{ const file = e.target.files?.[0]; if (file) handleUpload(file) }} className="text-sm text-gray-300" />
                    {uploading && <div className="text-xs text-gray-400 mt-2">Uploading...</div>}
                  </div>
                  {docs.length===0 && <div className="text-gray-500">No files</div>}
                  {docs.map((d:any,i:number)=>{
                    const filePath = `deal-${transaction.id}/${d.name}`
                    const handleDownload = async () => {
                      try{
                        const { data } = await supabase
                          .storage
                          .from(storageBucket)
                          .createSignedUrl(filePath, 60)
                        if (data?.signedUrl){
                          window.open(data.signedUrl, '_blank')
                        }
                      }catch(e){ console.error(e) }
                    }
                    const handleDelete = async () => {
                      try{
                        if (!confirm('Delete this file?')) return
                        await supabase
                          .storage
                          .from(storageBucket)
                          .remove([filePath])
                        const { data } = await supabase
                          .storage
                          .from(storageBucket)
                          .list(`deal-${transaction.id}`)
                        setDocs(data || [])
                      }catch(e){ console.error(e) }
                    }
                    return (
                      <div key={i} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded mt-2">
                        <button onClick={handleDownload} className="text-blue-400 hover:underline text-sm">{d.name}</button>
                        <button onClick={handleDelete} className="text-red-400 text-xs">Delete</button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-4 bg-gray-800 rounded">
                <h4 className="font-semibold mb-2">Assistant</h4>
                <div className="p-3 bg-gray-700 rounded mb-2 h-40 overflow-auto">
                  {chatMessages.map((m,i)=>(<div key={i} className={m.from==='assistant'? 'text-left mb-2':'text-right mb-2'}><div className="inline-block p-2 rounded bg-gray-600 text-gray-100">{m.text}</div></div>))}
                </div>
                <div className="flex gap-2">
                  <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700" placeholder="Ask Eva about this deal" />
                  <button onClick={async ()=>{ if(!input) return; await sendAIMessage(input); setInput('') }} className="px-3 py-2 bg-orange-500 rounded">Send</button>
                </div>
              </div>

            </div>

            <div>
              <div className="p-4 bg-gray-800 rounded mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Contacts</h4>
                  <button onClick={()=>setShowAddContact(!showAddContact)} className="text-xs px-2 py-1 bg-orange-500 rounded">{showAddContact? 'Cancel' : '+ Add'}</button>
                </div>
                {showAddContact && (
                  <div className="p-3 bg-gray-700 rounded mb-2">
                    <div className="grid grid-cols-1 gap-2 mb-2">
                      <select value={newContact.role} onChange={e=>setNewContact({...newContact,role:e.target.value})} className="w-full bg-gray-800 p-2 rounded text-sm">
                        <option value="">Select role...</option>
                        <option>Buyer Agent</option><option>Listing Agent</option><option>Lender</option>
                        <option>Title Company</option><option>Inspector</option><option>Appraiser</option>
                        <option>Attorney</option><option>Buyer</option><option>Seller</option><option>Other</option>
                      </select>
                      <input value={newContact.name} onChange={e=>setNewContact({...newContact,name:e.target.value})} className="w-full bg-gray-800 p-2 rounded text-sm" placeholder="Full name" />
                      <input value={newContact.email||''} onChange={e=>setNewContact({...newContact,email:e.target.value})} className="w-full bg-gray-800 p-2 rounded text-sm" placeholder="Email" />
                      <div className="flex gap-2">
                        <button onClick={addContact} className="px-3 py-2 bg-orange-500 rounded">Save</button>
                        <button onClick={()=>setShowAddContact(false)} className="px-3 py-2 bg-gray-700 rounded">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {localContacts.map((c,i)=> (
                    <div key={i} className="p-2 bg-gray-700 rounded flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-300">{c.role}</div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.company}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <a href={`tel:${c.phone}`} className="text-xs text-gray-300">Call</a>
                        <a href={`mailto:${c.email}`} className="text-xs text-gray-300">Email</a>                 <button onClick={()=>removeContact(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                      </div>
                    </div>
                  ))}
                  {localContacts.length===0 && <div className="text-gray-500 text-sm">No contacts yet.</div>}
                </div>
              </div>

              <div className="p-4 bg-gray-800 rounded">
                <h4 className="font-semibold mb-2">Checklist</h4>
                <div className="w-full bg-gray-700 h-3 rounded mb-2"><div className="h-3 bg-orange-500 rounded" style={{width: checklistProgress(checklist)+'%'}}></div></div>
                <div className="space-y-2">
                  {checklist.map((it:any)=> (
                    <div key={it.key} className="p-2 bg-gray-700 rounded flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{it.title}</div>
                        <div className="text-xs text-gray-400">{new Date(it.updated_at).toLocaleDateString()}</div>
                      </div>
                      <input type="checkbox" checked={it.status==='done'} onChange={()=>{ it.status= it.status==='done'?'todo':'done'; setChecklist([...checklist]) }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline mode */}
      {mode==='timeline' && (
        <div>
          <h3 className="font-semibold mb-3">Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm text-gray-300 mb-2">Upcoming</h4>
              <div className="space-y-3">
                {upcoming.length===0 && <div className="text-gray-500">No upcoming events.</div>}
                {upcoming.map((e,i)=> (
                  <div key={e.id||i} className="p-3 bg-gray-800 rounded flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded bg-gray-700">📅</div>
                    <div className="flex-1">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-sm text-gray-400">{fmtDate(e.date)}</div>
                    </div>
                    <div className="text-sm text-gray-300">{daysUntil(e.date)}d</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm text-gray-300 mb-2">Past</h4>
              <div className="space-y-3">
                {past.length===0 && <div className="text-gray-500">No past events.</div>}
                {past.slice().reverse().map((e,i)=> (
                  <div key={e.id||i} className="p-3 bg-gray-800 rounded flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded bg-gray-700">✓</div>
                    <div className="flex-1">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-sm text-gray-400">{fmtDate(e.date)}{e.note? ' • '+e.note:''}</div>
                    </div>
                    <div className="text-sm text-gray-300">{Math.max(0, Math.ceil((Date.now()-new Date(e.date!).getTime())/(1000*60*60*24)))}d ago</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
