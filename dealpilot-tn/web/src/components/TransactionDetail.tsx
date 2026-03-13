'use client'
import React, {useState, useEffect, useRef} from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { createChecklistInstance, checklistProgress } from '@/lib/tc-checklist'
import ContractUpload from './ContractUpload'
import ContractIntake from './ContractIntake'
import DocumentChecklist from './DocumentChecklist'
import DocumentComplianceBar from './DocumentComplianceBar'
import EditTransactionModal from './EditTransactionModal'
import DealPartiesPanel from './DealPartiesPanel/DealPartiesPanel'
import { getTransactionConfig, isDocApplicable } from '@/lib/transaction-phases'
import RecentAiInterpretations from "@/components/RecentAiInterpretations"


type Contact = { role:string, name:string, company?:string, phone?:string, email?:string }
type TimelineEvent = { id:string, title:string, date?:string, ts?:number, type?:string, note?:string }
type Transaction = { id:number, address:string, client:string, type:string, status:string, binding?:string, closing?:string, contacts?:Contact[], notes?:string, timeline?:TimelineEvent[] }

export default function TransactionDetail({transaction, onBack, onUpdateContacts}:{transaction:Transaction,onBack:()=>void,onUpdateContacts?:(txId:number,contacts:Contact[])=>void}){
  // mode: overview (default), documents, parties, deadlines, communications
  const [mode,setMode] = useState<'overview'|'documents'|'parties'|'deadlines'|'communications'>('overview')
  const [remote, setRemote] = useState<any>(null)
  const [mergedTx, setMergedTx] = useState<Transaction>(transaction)
  const [checklist,setChecklist]=useState(()=> createChecklistInstance())

  // ensure RF401 (Purchase & Sale) is present in checklist (12th item) for TN compliance
  useEffect(()=>{
    try{
      const has = checklist.findIndex((it:any)=> String(it.key).toLowerCase() === 'rf401')
      if(has === -1){ checklist.push({ key: 'rf401', title: 'Launch RF401 Wizard', status: 'todo' }); setChecklist([...checklist]) }
    }catch(e){}
  }, [])
  const [chatMessages,setChatMessages]=useState<any[]>([{from:'system',text:`Transaction: ${transaction.address} (${transaction.client})`}])
  const [input,setInput]=useState('')
  const [localContacts,setLocalContacts]=useState<Contact[]>(transaction.contacts || [])
  const [showAddContact,setShowAddContact]=useState(false)
  const [aiFilling,setAiFilling]=useState<Record<string,boolean>>({})
  const [newContact,setNewContact]=useState<Contact>({role:'',name:'',company:'',phone:'',email:''})
  const [contractData, setContractData] = useState<any>(()=>{ try{ const raw = localStorage.getItem(`dp-contract-${transaction.id}`); if(raw) return JSON.parse(raw) }catch(e){} return null })
  const [rfWarnings, setRfWarnings] = useState<string[]>([])

  // communication / draft state (fix: ensure variables referenced by Quick Actions exist)
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftTo, setDraftTo] = useState<string>('')
  const [draftSubject, setDraftSubject] = useState<string>('')
  const [draftBody, setDraftBody] = useState<string>('')
  const [draftContactId, setDraftContactId] = useState<number|undefined>(undefined)

  // helper to add a message to the Reva chat stream
  function addMessage(msg: {id?:string, role?:string, content?:string, from?:string, text?:string}){
    // normalize to expected shape
    const normalized = { from: msg.from || msg.role || (msg.role==='assistant'?'assistant':'user'), text: msg.text || msg.content || '' }
    setChatMessages(m=>[...m, normalized])
  }

  // storage bucket name used for signed URLs
  const storageBucket = 'contracts'

  // Draft / Quick Action helpers
  const [draftKind, setDraftKind] = useState<string>('')
  function openDraft(kind: string){
    setDraftKind(kind)
    // prefill subject/body/to based on kind
    const addr = mergedTx.address || ''
    const buyer = mergedTx.client || ''
    if(kind==='lender'){
      setDraftSubject(`Request: Loan status update for ${addr}`)
      setDraftBody(`Hi [Lender],\n\nThis is a status update request for ${addr}. Please confirm the current loan status and any outstanding conditions.\n\nThanks,\n${buyer}`)
      setDraftTo('[Lender Email]')
    } else if(kind==='title'){
      setDraftSubject(`Request: Title update for ${addr}`)
      setDraftBody(`Hi Title Team,\n\nCould you please provide the current title commitment status for ${addr}? Please include any exceptions or required cures.\n\nThanks,\n${buyer}`)
      setDraftTo('[Title Email]')
    } else if(kind==='closing'){
      setDraftSubject(`Reminder: Closing timeline for ${addr}`)
      setDraftBody(`Hello all,\n\nThis is a reminder that closing for ${addr} is upcoming. Please confirm final readiness and any outstanding items.\n\nThanks,\n${buyer}`)
      setDraftTo('[All Parties]')
    }
    // add visible draft message to chat immediately
    addMessage({ from: 'assistant', text: `Draft: ${draftSubject || ''}\n\n${draftBody || ''}` })
    setDraftOpen(true)
  }

  async function sendDraft(){
    // For now assume no GHL connected — queue locally and notify user
    try{
      // add audit log
      try{ await fetch('/api/audit/log',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'queue_message', resource:'communications', resource_id: transaction.id, details: { kind: draftKind, to: draftTo, subject: draftSubject } }) }) }catch(e){}
      // show queued notification
      alert('Message queued — connect GHL in Settings to send.')
    }catch(e){ console.error('sendDraft failed', e); alert('Failed to queue message') }
    setDraftOpen(false)
  }

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
      // audit upload
      try{ await fetch('/api/audit/log',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'upload_document', resource:'documents', resource_id: transaction.id, details: { filename: uploaded?.name || file.name, document_id: uploaded?.id } }) }) }catch(e){ console.error('audit failed', e) }

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

            // RF601 detection -> push ticker event for dashboard
            try{
              const rfLower = String(cj.rf_number||'').toLowerCase()
              if(rfLower.includes('rf401') || rfLower.includes('rf-401') || rfLower.includes('rf601') || rfLower.includes('rf-601') || (cj.category && String(cj.category).toLowerCase().includes('amendment'))){
                const now = Date.now()
                const newDate = (cj.extracted && (cj.extracted.inspection_end_date || cj.extracted.closing_date)) || cj.new_date || null
                const oldDate = cj.previous_inspection_date || cj.old_date || null
                // map label: RF401 is Purchase & Sale; RF601 is Amendment — we label ticker according to detection
                const label = (rfLower.includes('rf401') || rfLower.includes('rf-401')) ? 'Launch RF401 Wizard' : 'RF601 Amendment'
                const msg = newDate ? `${label} detected — Inspection deadline changed from ${oldDate||'unknown'} to ${newDate}` : `${label} detected — review changes.`
                const ev = { ts: now, dealId: transaction.id, message: msg, icon: '📝' }
                try{
                  // persist to server-backed ticker
                  const r = await fetch('/api/deal-ticker/add', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ transactionId: transaction.id, event_type: rfLower.includes('rf401')||rfLower.includes('rf-401') ? 'rf401' : 'rf601', message: msg, metadata: { detected: rfLower.includes('rf401')||rfLower.includes('rf-401') ? 'rf401' : 'rf601', uploaded_id: uploaded?.id } }) })
                  if(r.ok){
                    // also bump client UI via event
                    window.dispatchEvent(new CustomEvent('deal:ticker', { detail: ev }))
                  }
                }catch(e){ console.warn('ticker add failed', e) }

                // auto-check RF601 checklist item when classification detected (persist to DB)
                try{
                  const idxRf = checklist.findIndex((it:any)=> {
                    const k = String((it.key||'')).toLowerCase()
                    return k === 'rf601' || k === 'rf401'
                  })
                  if(idxRf !== -1){
                    checklist[idxRf].status = 'done';
                    setChecklist([...checklist])
                    // persist change to server-side checklist
                    try{ const ck = (rfLower.includes('rf401')||rfLower.includes('rf-401')) ? 'rf401' : 'rf601'; await fetch('/api/deal-checklist', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id, key: ck, status: 'done' }) }) }catch(e){ console.warn('persist checklist failed', e) }
                  }
                }catch(e){ /* ignore */ }

                // if classification includes a new binding/agreement date, persist it to transaction
                try{
                  const newBinding = (transaction && ((transaction as any).binding_date || (transaction as any).binding)) || (cj.extracted && (cj.extracted.binding_date || cj.extracted.binding)) || cj.new_binding || null
                  if(newBinding){
                    try{ await fetch('/api/transactions/'+transaction.id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ fields: { binding: newBinding, binding_date: newBinding } }) }) }catch(e){ console.warn('persist binding failed', e) }
                  }
                }catch(e){ }
              }
            }catch(e){ console.warn('ticker push failed', e) }
          }

          // RF form detection & RF-specific checks
          try{
            // fetch full extraction (if available)
            const exRes = await fetch('/api/ai/docs/extract', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ document_id: uploaded.id }) })
            if(exRes.ok){
              const exJson = await exRes.json()
              const text = (exJson.extraction && JSON.stringify(exJson.extraction)) || exJson.text || exJson.content || ''
              const txt = (text || '').toString().toLowerCase()
              const warnings:string[] = []

              // simple classification by keyword
              let detected = 'other'
              if(txt.includes('rf-401') || txt.includes('time limit of offer') || txt.includes('offer') && txt.includes('time limit')) detected = 'rf401'
              else if(txt.includes('rf-601') || txt.includes('amendment')) detected = 'rf601'
              else if(txt.includes('rf-651') || txt.includes('repair') || txt.includes('replacement')) detected = 'rf651'

              // RF401 checks
              if(detected === 'rf401'){
                // check Time Limit of Offer date
                const timeLimitMatch = text.match(/time limit of offer[:\s]*([A-Za-z0-9,\s]+)/i) || text.match(/time limit[:\s]*([A-Za-z0-9,\s]+)/i)
                if(timeLimitMatch && timeLimitMatch[1]){
                  const parsed = new Date(timeLimitMatch[1].trim())
                  if(!isNaN(parsed.getTime())){
                    if(parsed.getTime() < Date.now()){
                      warnings.push('RF401: Time Limit of Offer has passed')
                    }
                  }
                }

                // check inspection period days (TN default 10 days)
                const inspMatch = text.match(/inspection period[:\s]*([0-9]{1,2})/i) || text.match(/inspection[:\s]*period[:\s]*([0-9]{1,2})/i)
                if(inspMatch && inspMatch[1]){
                  const days = Number(inspMatch[1])
                  if(isNaN(days) || days < 10) warnings.push(`RF401: Inspection period is ${days} day(s) (TN default 10 days)`) 
                } else {
                  warnings.push('RF401: Inspection period missing or not found (TN default 10 days)')
                }
              }

              // RF601 / RF651 quick checks (placeholder)
              if(detected === 'rf601'){
                warnings.push('RF601 detected — verify amendment effective dates')
              }
              if(detected === 'rf651'){
                warnings.push('RF651 detected — verify repair responsibilities and timelines')
              }

              if(warnings.length>0){
                setRfWarnings(prev=>[...prev, ...warnings])
              }
            }
          }catch(e){ console.warn('rf checks failed', e) }

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
  const fmtDate = (d?:string|Date|null)=>{ if(d===null || d===undefined || d==='') return 'Not set'; try{ const dt = typeof d==='string'? new Date(d): d; return isNaN(dt.getTime())? 'Not set' : dt.toLocaleDateString() }catch(e){ return 'Not set' } }
  const daysUntil = (d?:string|Date|null)=>{ if(d===null || d===undefined || d==='') return null; const t = new Date(d).getTime(); if(isNaN(t)) return null; return Math.ceil((t-Date.now())/(1000*60*60*24)) }

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

  // Deal state phases (user-facing)
  const PHASE_ORDER = ['Draft','Under Contract','Due Diligence','Post-Inspection','Closing Prep','Closed']
  const INTERNAL_MAP: Record<string,string> = { Draft:'draft', 'Under Contract':'binding', 'Due Diligence':'inspection_period', 'Post-Inspection':'post_inspection', 'Closing Prep':'post_inspection', 'Closed':'closed' }

  const transitionPhase = async (toPhase:string) => {
    try{
      const res = await fetch('/api/deal-state/transition', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id, to_phase: toPhase, triggered_by: 'web' }) })
      if(!res.ok){ const j = await res.json().catch(()=>({})); throw new Error(j.error || 'transition failed') }
      // refresh remote deal-state
      const r = await fetch(`/api/deal-state/${transaction.id}`)
      if(r.ok){ const j = await r.json(); setRemote(j); setMergedTx(prev=>({ ...prev, ...(j||{}) })) }
    }catch(e){ alert('Transition failed: '+String(e)) }
  }


  // timeline events: prefer remote.timeline else build from docs/deadlines
  const timelineEvents:TimelineEvent[] = React.useMemo(()=>{
    const remoteEvents:TimelineEvent[] = (remote && remote.timeline) ? remote.timeline.map((e:any)=>({ id: e.id||String(e.ts||Math.random()), title: e.title||e.name||e.event, date: e.date, ts: e.ts, type: e.type, note: e.note })) : []
    const auto = (deadlines||[]).map(d=>({ id:d.key, title:d.title, date: d.date ? d.date.toISOString() : undefined, type:'deadline' }))
    const combined = [...(remoteEvents||[]), ...auto]
    // deduplicate by title+date
    const seen = new Set<string>()
    const deduped = [] as TimelineEvent[]
    for(const e of combined){
      if(!e.date) continue
      const key = `${(e.title||'').toString().trim()}::${new Date(e.date).toISOString()}`
      if(seen.has(key)) continue
      seen.add(key)
      deduped.push(e)
    }
    // sort by date ascending
    return deduped.sort((a,b)=> new Date(a.date!).getTime() - new Date(b.date!).getTime())
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
        path: d.path || d.storage_path || null,
      }
    })
    return m
  }, [docs])

  // priorities state
  const [priorities, setPriorities] = React.useState<any[]>([])
  const [editOpen, setEditOpen] = React.useState(false)
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

  const [showIntake, setShowIntake] = useState(false)
  const [extractionPreview, setExtractionPreview] = useState<any|null>(null)
  const [mobileRevaOpen, setMobileRevaOpen] = useState(false)
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
      const ctx = { id: mergedTx.id, address: mergedTx.address, client: mergedTx.client, type: mergedTx.type, status: mergedTx.status, binding: mergedTx.binding_date || mergedTx.binding, closing: (mergedTx as any).closing_date || mergedTx.closing, contacts: (localContacts||[]).map(c=>({role:c.role,name:c.name})), notes: mergedTx.notes }
      const res = await fetch('/api/eva/chat', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ messages:[user], style:'friendly-tn', dealId: mergedTx.id }) })
      const j = await res.json()
      const reply = j.reply || j.message || j.choices?.[0]?.message?.content || 'Sorry, no response.'
      setChatMessages(m=>[...m, {from:'assistant', text: reply}])
      // if the assistant returned an actionable open_wizard command, dispatch event to open
      try{ if(j.action && j.action.type === 'open_wizard' && j.action.dealId){ window.dispatchEvent(new CustomEvent('rookwizard:open', { detail: { transactionId: j.action.dealId, address: mergedTx.address || transaction.address } })); } }catch(e){}
    }catch(e:any){
      setChatMessages(m=>[...m, {from:'assistant', text: 'Error contacting AI: '+String(e)}])
    }
  }

  async function addContact(){
    if(!newContact.name||!newContact.role) return
    const candidate = { ...newContact }
    try{
      const res = await fetch('/api/deal-parties/save', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ transactionId: transaction.id, contacts: [candidate] }) })
      if(res.ok){ const j = await res.json(); const saved = j.contacts || []; const updated = [...localContacts, ...saved.map((c:any)=>({ role: candidate.role, name: c.name, company: c.company, phone: c.phone, email: c.email }))]; setLocalContacts(updated); if(onUpdateContacts) onUpdateContacts(transaction.id, updated) }
    }catch(e){ console.error('save contact failed', e); const updated = [...localContacts, {...candidate}]; setLocalContacts(updated); if(onUpdateContacts) onUpdateContacts(transaction.id, updated) }
    setNewContact({role:'',name:'',company:'',phone:'',email:''})
    setShowAddContact(false)
    try{ await fetch('/api/audit/log',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'add_party', resource: 'deal_parties', resource_id: transaction.id, details: { party: candidate } }) }) }catch(e){ console.error('audit failed', e) }
  }
  async function removeContact(idx:number){ const updated = localContacts.filter((_,i)=>i!==idx); setLocalContacts(updated); if(onUpdateContacts) onUpdateContacts(transaction.id, updated); try{ await fetch('/api/audit/log',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'remove_party', resource: 'deal_parties', resource_id: transaction.id, details: { removed_index: idx } }) }) }catch(e){ console.error('audit failed', e) } }

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
  const [recentAiInterpretations, setRecentAiInterpretations] = React.useState<any[]>([])
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

    // load recent AI interpretations for communications panel
    ;(async ()=>{
      try{
        const r = await fetch('/api/deal-activity-log/recent', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id, limit: 5 }) })
        if(!r.ok) return
        const j = await r.json()
        if(mounted && j && j.results) setRecentAiInterpretations(j.results || [])
      }catch(e){ }
    })()

    return () => { mounted = false }
  }, [transaction.id])

  // playbook rules/progress for this deal (stepper)
  const [playbookSteps, setPlaybookSteps] = React.useState<any[]>([])
  React.useEffect(()=>{
    let mounted = true
    async function loadPlaybook(){
      try{
        const res = await fetch('/api/reva/playbook-gaps', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id }), credentials: 'include' })
        if(!res.ok) return
        const j = await res.json()
        if(!mounted) return
        const rows = (j.results && j.results[0] && j.results[0].gaps) ? j.results[0].gaps : []
        // sort by implied urgency then by days_diff
        rows.sort((a:any,b:any)=> (a.sort_order||0) - (b.sort_order||0))
        setPlaybookSteps(rows)
      }catch(e){ console.warn('playbook steps load failed', e) }
    }
    loadPlaybook()
    return ()=>{ mounted=false }
  },[transaction.id])

  const markMilestoneComplete = async (milestone_key:string)=>{
    try{
      const res = await fetch('/api/reva/playbook-progress', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id, milestone_key, completed_by: 'web-ui' }) })
      if(!res.ok) throw new Error('failed')
      const j = await res.json()
      // refresh steps
      const refresh = await fetch('/api/reva/playbook-gaps', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id }), credentials: 'include' })
      if(refresh.ok){ const rj = await refresh.json(); const rows = (rj.results && rj.results[0] && rj.results[0].gaps) ? rj.results[0].gaps : []; setPlaybookSteps(rows) }
    }catch(e){ console.error('mark milestone failed', e) }
  }

  // Inline edit states
  const [editing, setEditing] = useState(false)
  const [editStatus, setEditStatus] = useState<string>(mergedTx.status || '')
  const [editBinding, setEditBinding] = useState<string|undefined>((mergedTx as any).binding_date || (mergedTx as any).binding || '')
  const [editClosing, setEditClosing] = useState<string|undefined>((mergedTx as any).closing_date || (mergedTx as any).closing || '')
  const [editValue, setEditValue] = useState<number|undefined>((mergedTx as any).purchase_price || (mergedTx as any).value || undefined)

  // notes
  const [notes, setNotes] = useState<any[]>([])
  const [noteText, setNoteText] = useState('')
  React.useEffect(()=>{
    let mounted = true
    async function loadNotes(){
      try{
        const res = await fetch(`/api/deal-notes?dealId=${transaction.id}`)
        if(!mounted) return
        if(res.ok){ const j = await res.json(); setNotes(j.notes || []) }
      }catch(e){ }
    }
    loadNotes()
    return ()=>{ mounted=false }
  },[transaction.id])

  const saveInlineEdits = async ()=>{
    try{
      const payload:any = { fields: {} }
      payload.fields.status = editStatus
      if(editBinding) payload.fields.binding = editBinding
      if(editClosing) payload.fields.closing = editClosing
      if(editValue != null) payload.fields.purchase_price = editValue
      const res = await fetch('/api/transactions/'+transaction.id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if(!res.ok){ console.error('update failed'); return }
      const j = await res.json()
      // refresh remote
      const r = await fetch(`/api/deal-state/${transaction.id}`)
      if(r.ok){ const rd = await r.json(); setRemote(rd); setMergedTx({...mergedTx, ...(rd||{})}) }
      setEditing(false)
    }catch(e){ console.error('save edits failed', e) }
  }

  const addNote = async ()=>{
    if(!noteText) return
    try{
      const res = await fetch('/api/deal-notes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id, author: 'web', content: noteText }) })
      if(res.ok){ const j = await res.json(); setNotes(prev=>[j.note, ...prev]); setNoteText('') }
    }catch(e){ console.error('add note failed', e) }
  }



  return (
    <>
    <div className="p-4 rounded-lg bg-gray-900 text-white min-h-[400px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div>
          <button onClick={onBack} className="text-sm text-orange-300">&larr; Back</button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold mt-1">{mergedTx.address}</h2>
            <span className={`px-2 py-1 rounded text-sm font-semibold ${health?.status==='healthy' ? 'bg-green-50 text-green-700 border border-green-200' : health?.status==='attention' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : health?.status==='at_risk' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-800 text-gray-300'}`}>{health ? (transaction?.status === 'Closed' ? 'Closed – Complete' : health.status==='healthy'? 'Healthy' : health.status==='attention'? 'Needs Attention' : 'At Risk') : `#${transaction.id}`}</span>
          </div>
          <div className="text-sm text-gray-300 font-semibold">Client: {mergedTx.client || '—'} • Status: <span className={`px-2 py-1 rounded ${mergedTx.status==='Active'?'bg-green-800 text-green-100':'bg-gray-800 text-gray-200'}`}>{mergedTx.status}</span></div>
        </div>
        <div className="text-right text-sm text-gray-300">
          <div>Binding: <span className="font-semibold">{fmtDate((mergedTx as any).binding_date || mergedTx.binding)}</span></div>
          <div>Closing: <span className="font-semibold">{fmtDate((mergedTx as any).closing_date || mergedTx.closing)}</span></div>
        </div>
      </div>

      {/* Quick Actions: Reva-driven drafts */}
      <div className="mb-4 flex gap-2">
        <button onClick={async ()=>{
            try{
              // fetch deal-state and find lender
              const r = await fetch(`/api/deal-state/${transaction.id}`)
              if(!r.ok){ addMessage({ from:'assistant', text: "Could not load deal contacts." }); return }
              const j = await r.json()
              const contacts = j.contacts || []
              const lender = (contacts||[]).find((c:any)=> (c.role||'').toLowerCase().includes('lender') || (c.role||'').toLowerCase().includes('loan') )
              if(!lender || !lender.phone){ addMessage({ from:'assistant', text: "Lender contact not found or missing phone number." }); return }
              const phone = lender.phone
              const message = `Hi ${lender.name || 'Lender'}, this is the Closing Assistant for ${mergedTx.client || 'your agent'}. We are requesting a loan status update for the property at ${mergedTx.address || ''}. Please reply with the current status. Thanks!`
              const send = await fetch('/api/ghl/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ channel: 'sms', recipient: phone, message, contact_id: null }) })
              if(!send.ok){ addMessage({ from:'assistant', text: "Failed to send lender request via Hublinkpro." }); return }
              // log to deal_activity_log for compliance trail
              try{ await fetch('/api/deal-activity-log/add', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id, recipient: lender.name || lender.phone || 'Lender', message }) }) }catch(e){ console.warn('activity log failed', e) }

              addMessage({ from:'assistant', text: "I've sent the status request to the lender via Hublinkpro. I'll notify you here when they reply." })
            }catch(e){ console.error('request lender failed', e); addMessage({ from:'assistant', text: 'Failed to request lender status.' }) }
          }} className="px-3 py-2 rounded bg-indigo-600 text-white">Request Lender Status Update</button>
        <button onClick={()=>openDraft('title')} className="px-3 py-2 rounded bg-indigo-600 text-white">Request Title Update</button>
        <button onClick={()=>openDraft('closing')} className="px-3 py-2 rounded bg-rose-600 text-white">Send Closing Reminder to All Parties</button>
        <button onClick={()=>{ window.dispatchEvent(new CustomEvent('rookwizard:open', { detail: { transactionId: transaction.id, address: transaction.address } })); }} className="px-4 py-2 rounded bg-orange-500 text-black font-semibold">RF401 Wizard</button>
      </div>

      {/* Mobile: floating Ask Reva button */}
      <button onClick={()=>setMobileRevaOpen(true)} className="md:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-orange-500 text-black flex items-center justify-center shadow-lg">💬</button>




      {/* EVA HERO (top) - small iterative addition */}
      <div className="mb-4 rounded-lg bg-[#061021] p-4 border border-white/6 hidden md:block">
        <div className="mb-2 text-sm text-gray-300 flex items-center gap-3"><img src="/reva-avatar.png" alt="Reva" className="w-10 h-10 rounded-full object-cover" /><span>Reva — Deal Assistant</span></div>
        <div className="h-40 overflow-auto p-2 bg-gray-800 rounded mb-3">
          {chatMessages.map((m,i)=>(
            <div key={i} className={m.from==='assistant' ? 'mb-2 text-left' : 'mb-2 text-right'}>
              <div className={`inline-block p-2 rounded ${m.from==='assistant' ? 'bg-gray-700 text-gray-100' : 'bg-orange-500 text-black'}`}>{String(m.text||'').replace(/\}/g,'')}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Reva about this deal..." className="flex-1 px-3 py-2 rounded bg-gray-800 border border-white/10" />
          <button onClick={async ()=>{ if(!input) return; await sendAIMessage(input); setInput('') }} className="px-4 py-2 bg-orange-500 rounded">Ask</button>
        </div>
        <div className="mt-3 flex gap-2">
          {/* Dynamic actions driven by playbook gaps */}
          {(()=>{
            const [gapActions, setGapActions] = React.useState<any[]>([])
            React.useEffect(()=>{
              let mounted = true
              ;(async ()=>{
                try{
                  const res = await fetch('/api/reva/playbook-gaps', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id }), credentials: 'include' })
                  if(!res.ok) return
                  const j = await res.json()
                  if(!mounted) return
                  const gaps = j.results && j.results[0] ? j.results[0].gaps || [] : []
                  const actions = (gaps || []).slice(0,4).map((g:any)=> ({ key: g.milestone_key, label: `${g.milestone_label} — ${g.status === 'overdue' ? `${Math.abs(g.days_diff)}d overdue` : g.status === 'due_today' ? 'due today' : g.days_diff!=null? `${g.days_diff}d` : ''}`, gap: g }))
                  setGapActions(actions)
                }catch(e){ console.warn('playbook gaps error', e); if(mounted) setGapActions([]) }
              })()
              return ()=>{ mounted = false }
            },[transaction.id])

            if(!gapActions) return <div className="text-sm text-gray-400">Loading actions…</div>
            if(gapActions.length===0) return <>
              <button onClick={async ()=>{ await sendAIMessage("What's missing?") }} className="px-3 py-1 bg-gray-800 rounded">What's missing?</button>
              <button onClick={async ()=>{ await sendAIMessage('Draft follow-up email') }} className="px-3 py-1 bg-gray-800 rounded">Draft follow-up email</button>
            </>

            return gapActions.map((a:any,i:number)=>(
              <button key={i} onClick={async ()=>{ const txt = `Action request: ${a.label} for ${String(mergedTx.address||'')}. Context: ${JSON.stringify(a.gap)}`; addMessage({ id:`user_${Date.now()}`, role:'user', content: txt }); await sendAIMessage(txt) }} className="px-3 py-1 bg-gray-800 rounded">{a.label}</button>
            ))
          })()}
        </div>
      </div>

      {/* RF-specific warnings (from document extractions) */}
      {rfWarnings && rfWarnings.length>0 && (
        <div className="mb-4 space-y-2">
          {rfWarnings.map((w,i)=> (
            <div key={i} className={`p-3 rounded ${w.toLowerCase().includes('passed')||w.toLowerCase().includes('missing') ? 'bg-amber-700 text-white' : 'bg-orange-600 text-white'}`}>
              <div className="font-semibold">{w}</div>
            </div>
          ))}
        </div>
      )}

      {/* Document compliance bar */}
      {(() => {
        try{
          const side = transaction.type === 'seller' ? 'seller' : 'buyer'
          const cfg = getTransactionConfig({ state: 'TN', side })
          const requiredDocs: any[] = []
          for(const ph of cfg.phases){ for(const d of ph.documents){ if(d.requirement && d.requirement.level==='required') requiredDocs.push(d) }}
          const total = requiredDocs.length
          let done = 0
          const missing: any[] = []
          for(const d of requiredDocs){ const rec = documentsByKey[d.key]; if(rec && (rec.status==='uploaded' || rec.status==='signed')) done++; else missing.push(d) }
          return (
            <DocumentComplianceBar requiredTotal={total} doneCount={done} missingDocs={missing} onSelectMissing={(k:string)=>{ setMode('documents'); setTimeout(()=>{},20) }} />
          )
        }catch(e){ return null }
      })()}


      {/* Tabs removed — AI-first contextual panels. Showing streamlined overview by default. */}
      <div style={{display:'none'}} />

      {/* Overview / Parties / Communications tabs content */}
      {mode==='overview' && (
        <div className="p-4 rounded bg-[#061021]" style={{border: '1px solid rgba(249,115,22,0.12)'}}>
          <div className="mb-4">
            {/* document compliance badges already rendered above; stats row below */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 rounded" style={{background: '#0d1b2a'}}>
                <div className="text-sm text-gray-300">Days to Close</div>
                <div className="text-xl font-bold text-white">{(() => { const d = (mergedTx as any).closing_date || mergedTx.closing; const days = daysUntil(d); if(days===null) return 'Not set'; if(days < 0) return `Closed ${Math.abs(days)} days ago`; return `${days} days`; })()}</div>
              </div>
              <div className="p-3 rounded" style={{background: '#0d1b2a'}}>
                <div className="text-sm text-gray-300">Documents</div>
                <div className="text-xl font-bold text-white">{docs ? docs.length : '—'}</div>
              </div>
              <div className="p-3 rounded" style={{background: '#0d1b2a'}}>
                <div className="text-sm text-gray-300">Next Deadline</div>
                <div className="text-xl font-bold text-white">{deadlines && deadlines.length>0 ? fmtDate(deadlines[0].date) : '—'}</div>
              </div>
              <div className="p-3 rounded" style={{background: '#0d1b2a'}}>
                <div className="text-sm text-gray-300">Deal Value</div>
                <div className="text-xl font-bold text-white">{((mergedTx as any).purchase_price || (mergedTx as any).value) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number((mergedTx as any).purchase_price || (mergedTx as any).value)) : '—'}</div>
              </div>
            </div>

            {/* Audit Button: prominent, full-width under metrics */}
            <div className="mb-4">
              <a href={`/api/transactions/${transaction.id}/audit-report`} className="w-full inline-block text-center px-4 py-3 bg-orange-500 text-black font-semibold rounded-lg hover:bg-orange-400 transition">
                ⬇️ Download Audit Log
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded" style={{background: '#0d1b2a'}}>
              <div className="text-sm text-gray-300">Property</div>
              <div className="text-lg font-bold text-white">{mergedTx.address || '—'}</div>
              <div className="text-sm text-gray-400">Type: {mergedTx.type || '—'}</div>
            </div>
            <div className="p-3 rounded" style={{background: '#0d1b2a'}}>
              <div className="text-sm text-gray-300">Client</div>
              <div className="text-lg font-bold text-white">{mergedTx.client || '—'}</div>
              <div className="text-sm text-gray-400">Status: {mergedTx.status || '—'} • Agent: {(remote && remote.agent) || '—'}</div>

              {/* Inline edit controls */}
              <div className="mt-3 space-y-2">
                {!editing ? (
                  <div className="flex gap-2 items-center">
                    <button onClick={()=>{ setEditing(true); setEditStatus(mergedTx.status||''); setEditBinding((mergedTx as any).binding||''); setEditClosing((mergedTx as any).closing_date || (mergedTx as any).closing || ''); setEditValue((mergedTx as any).purchase_price || (mergedTx as any).value || undefined) }} className="px-3 py-1 bg-gray-700 rounded text-sm">Edit deal</button>
                      <button onClick={async ()=>{ if(!window.confirm('Delete this transaction? This cannot be undone.')) return; try{ const id = transaction?.id || (mergedTx && (mergedTx as any).id); const res = await fetch('/api/transactions/'+id, { method: 'DELETE' }); if(!res.ok){ const j=await res.json(); alert('Delete failed: '+(j.error||res.statusText)); return } // navigate back to transactions
                      window.location.href = '/transactions'; }catch(e){ console.error(e); alert('Delete failed') } }} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Delete Transaction</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <label className="text-xs text-gray-400">Status</label>
                      <select value={editStatus} onChange={e=>setEditStatus(e.target.value)} className="bg-[#0f223a] px-2 py-1 rounded">
                        {['Pending','Active','Under Contract','Closing','Closed','Cancelled'].map(s=> (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="text-xs text-gray-400">Binding</label>
                      <input type="date" value={editBinding||''} onChange={e=>setEditBinding(e.target.value)} className="bg-[#0f223a] px-2 py-1 rounded" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="text-xs text-gray-400">Closing</label>
                      <input type="date" value={editClosing||''} onChange={e=>setEditClosing(e.target.value)} className="bg-[#0f223a] px-2 py-1 rounded" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="text-xs text-gray-400">Value</label>
                      <input type="number" value={editValue||''} onChange={e=>setEditValue(Number(e.target.value))} className="bg-[#0f223a] px-2 py-1 rounded" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveInlineEdits} className="px-3 py-1 bg-orange-500 rounded">Save</button>
                      <button onClick={()=>setEditing(false)} className="px-3 py-1 bg-gray-700 rounded">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode==='parties' && (
        <div className="p-4 rounded bg-[#061021]" style={{border: '1px solid rgba(249,115,22,0.12)'}}>
          {((mergedTx as any).buyer_names || (mergedTx as any).seller_names) ? (
            <div className="grid grid-cols-1 gap-2">
              {((mergedTx as any).buyer_names || '').toString().split(',').map((n:any,i:number)=>n.trim()).filter(Boolean).map((name:string,i:number)=>(
                <div key={`buyer-${i}`} className="p-2 bg-gray-800 rounded">
                  <div className="font-semibold text-white">{name}</div>
                  <div className="text-xs text-gray-400">Buyer</div>
                </div>
              ))}
              {((mergedTx as any).seller_names || '').toString().split(',').map((n:any,i:number)=>n.trim()).filter(Boolean).map((name:string,i:number)=>(
                <div key={`seller-${i}`} className="p-2 bg-gray-800 rounded">
                  <div className="font-semibold text-white">{name}</div>
                  <div className="text-xs text-gray-400">Seller</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-lg font-semibold text-white mb-2">No parties added yet</div>
              <div className="text-sm text-gray-400 mb-4">Add parties to this deal to keep contact info and roles in one place.</div>
              <button onClick={()=>setShowAddContact(true)} className="px-4 py-2 rounded bg-orange-500 text-white">Add Party</button>
            </div>
          )}
        </div>
      )}

      {mode==='communications' && (
        <div className="p-4 rounded bg-[#061021]" style={{border: '1px solid rgba(249,115,22,0.12)'}}>
          {(!(remote && (remote.communication_log || remote.communications)) || (remote.communication_log && remote.communication_log.length===0) || (remote.communications && remote.communications.length===0)) ? (
            <div className="text-center py-8">
              <div className="text-lg font-semibold text-white mb-2">No communications logged</div>
              <div className="text-sm text-gray-400 mb-4">Log phone calls, emails, and notes to keep the deal history complete.</div>
              <button className="px-4 py-2 rounded bg-orange-500 text-white">Log Entry</button>
            </div>
          ) : (
            <div className="space-y-3">
              {(remote.communication_log || remote.communications || []).map((e:any,i:number)=> (
                <div key={i} className="p-3 rounded" style={{background: '#0d1b2a'}}>
                  <div className="flex justify-between items-center">
                    <div className="font-semibold text-white">{e.subject || e.title || e.type || 'Entry'}</div>
                    <div className="text-sm text-gray-300">{fmtDate(e.date || e.created_at)}</div>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{e.note || e.body || e.summary || ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent AI Interpretations panel (communications) */}
      {mode==='communications' && (
        <div className="mt-3 p-3 rounded bg-[#07101a] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-300">Recent AI Interpretations</div>
            <div className="text-xs text-gray-500">Last 5</div>
          </div>
          <RecentAiInterpretations data={recentAiInterpretations} />
        </div>
      )}

      {/* Mission Control */}
      {mode==='mission' && (
        <div>
          {/* Skeletons when briefing or data missing */}
          {!brief && (
            <div className="mb-4 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/3 mb-2"></div>
              <div className="h-12 bg-gray-700 rounded w-full mb-2"></div>
            </div>
          )}
          {/* cockpit header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-300">Mission Cockpit</div>
              <div className="text-xl font-bold">{String(mergedTx.address || '').replace(/\}/g, '')} — {String(mergedTx.client || '').replace(/\}/g, '')}</div>
              <div className="text-sm text-gray-400">Stage: <span className="font-semibold">{transaction?.status === 'Closed' ? 'Closed' : stageFromProgress(combinedProgress())}</span> • {transaction?.status === 'Closed' ? 100 : combinedProgress()}% complete</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div className="text-xs text-gray-300">Deal Health</div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${health?.status==='healthy' ? 'bg-green-500' : health?.status==='attention' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                  <div className="font-semibold">{health ? (transaction?.status === 'Closed' ? 'Closed – Complete' : health.status==='healthy'? 'Healthy' : health.status==='attention'? 'Needs Attention' : 'At Risk') : `#${transaction.id}`}</div>
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
                <div className="flex flex-col items-end">
                  <div className="text-xs text-gray-300">Deal Health</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{ const blob = new Blob([JSON.stringify({transaction: mergedTx, contacts: localContacts, contractData}, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`deal-${transaction.id}-export.json`; a.click(); URL.revokeObjectURL(url); }} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded">Export</button>
                  <a href={`/api/transactions/${transaction.id}/audit-report`} className="ml-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm">Download Compliance Report</a>
                  <button onClick={()=>setMode('dealroom')} className="px-3 py-2 bg-orange-500 rounded">Open Deal Room</button>
                  <button onClick={()=>setEditOpen(true)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded">✎ Edit Deal</button>
                </div>
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
                  <button onClick={()=>setMode('documents')} className="px-3 py-2 bg-orange-500 rounded">Open Documents</button>
                  <button onClick={()=>setMode('deadlines')} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded">View Deadlines</button>
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

          {/* Playbook stepper (Phase milestones) */}
          {playbookSteps && playbookSteps.length>0 && (
            <div className="bg-gray-800 p-4 rounded mb-4">
              <h3 className="text-lg font-semibold mb-2">Playbook Progress</h3>
              <div className="space-y-2">
                {playbookSteps.map((s:any,i:number)=>{
                  const status = s.status || 'unscheduled'
                  const badge = status === 'completed' ? '✅' : status === 'overdue' ? '⚠️' : status === 'due_today' ? '🔔' : '•'
                  return (
                    <div key={s.milestone_key||i} className="p-2 bg-gray-700 rounded flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{s.milestone_label} <span className="text-xs text-gray-400">({s.responsible_party||'—'})</span></div>
                        <div className="text-xs text-gray-400">Due: {s.expected_date ? new Date(s.expected_date).toLocaleDateString() : 'Not set'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-200">{badge}</div>
                        {s.status !== 'completed' && <button onClick={()=>markMilestoneComplete(s.milestone_key)} className="px-2 py-1 bg-orange-500 rounded text-sm">Mark complete</button>}
                      </div>
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
                      if(refresh.ok){ const rj = await refresh.json(); setDocs(rj || []) }

                      // if the uploaded doc looks like a Purchase & Sale (classification present), run AI extraction
                      try{
                        const docId = j?.document?.id || j?.id || null
                        const rf = j?.document?.rf_number || j?.rf_number || null
                        const category = j?.document?.category || j?.category || null
                        const looksLikePS = (rf && String(rf).toLowerCase().includes('rf401')) || String(category||'').toLowerCase().includes('purchase')
                        if(docId && looksLikePS){
                          const exRes = await fetch('/api/ai/docs/extract', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ document_id: docId }) })
                          if(exRes.ok){ const exJson = await exRes.json(); setExtractionPreview(exJson.extraction || exJson) }
                        }
                      }catch(e){ console.warn('extraction failed', e) }
                    } else {
                      console.error('Upload failed', await res.text())

                      alert('Upload failed')
                    }
                  }catch(err){ console.error(err); alert('Upload error') }
                };
                input.click();
              }
            }}
            onView={async (path: string) => {
              try{
                if(!path) return
                const { data } = await supabase.storage.from('contracts').createSignedUrl(path, 60)
                if(data?.signedUrl) window.open(data.signedUrl, '_blank')
              }catch(e){ console.error('view error', e) }
            }}
            onDownload={async (path: string) => {
              try{
                if(!path) return
                const { data } = await supabase.storage.from('contracts').createSignedUrl(path, 60)
                if(data?.signedUrl){
                  const a = document.createElement('a')
                  a.href = data.signedUrl
                  a.download = ''
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                }
              }catch(e){ console.error('download error', e) }
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

      {/* Deal Room / other panels — only show in Overview (not in Documents tab) */}
      {mode==='overview' && (
        <div>
          <div className="mb-3 text-sm text-gray-300">Deal Room — core deal artifacts and workflows</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div />
                  <div className="flex gap-2">
                    <button onClick={()=>setMode('documents')} className="px-3 py-1 rounded-lg bg-[#0f3460] border border-white/10 text-sm text-gray-200">Open Contract</button>
                    <button onClick={()=>setShowIntake(true)} className="px-3 py-1 rounded-lg bg-[#16213e] border border-white/10 text-sm text-gray-200">Upload Contract (AI)</button>
                  </div>
                </div>
                <ContractUpload dealId={String(transaction.id)} onSave={(data)=>{ setContractData(data); if((data as any)?.__remote){ const r=(data as any).__remote; setRemote(r); setMergedTx(prev=>({ ...prev, ...(r||{}) })); if(r.contacts) setLocalContacts(r.contacts) } }} onDelete={()=>setContractData(null)} />

                {/* Compact Contract Summary Card (collapsible) */}
                <div className="mt-4 p-3 bg-gray-900 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400">Contract Summary</div>
                      <div className="text-lg font-bold text-white">{contractData?.buyer || mergedTx.client || 'Buyer'} • {contractData?.property_address || mergedTx.address || 'Property'}</div>
                      <div className="text-sm text-gray-400">Price: {contractData?.purchase_price ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(contractData.purchase_price) : (mergedTx as any).purchase_price ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((mergedTx as any).purchase_price) : '—'} • Closing: {fmtDate(contractData?.closing_date || (mergedTx as any).closing_date || mergedTx.closing)}</div>
                    </div>
                    <div>
                      <button onClick={()=>{ const el = document.getElementById('contract-full-details-'+transaction.id); if(!el){ const node = document.createElement('div'); node.id = 'contract-full-details-'+transaction.id; node.innerText = JSON.stringify(contractData || mergedTx, null, 2); node.className = 'mt-3 p-2 bg-gray-800 rounded text-xs text-gray-300 whitespace-pre-wrap'; document.getElementById('contract-summary-'+transaction.id)?.appendChild(node); } else { const existing = document.getElementById('contract-full-details-'+transaction.id); existing.remove(); } }} className="px-3 py-1 bg-gray-800 rounded text-sm">Show full details</button>
                    </div>
                  </div>
                  <div id={`contract-summary-${transaction.id}`} />
                </div>

              </div>

              <div className="p-4 bg-gray-800 rounded">
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
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
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
                        try{ await fetch('/api/audit/log',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete_document', resource:'documents', resource_id: transaction.id, details: { filename: d.name, filePath } }) }) }catch(e){ console.error('audit failed', e) }
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

              <div className="mb-4">
                {/* Deal parties: prefer committed transaction fields (buyer_names/seller_names) when present */}
                {((mergedTx as any).buyer_names || (mergedTx as any).seller_names) ? (
                  <div className="grid grid-cols-1 gap-2">
                    {((mergedTx as any).buyer_names || '').toString().split(',').map((n:any,i:number)=>n.trim()).filter(Boolean).map((name:string,i:number)=>(
                      <div key={`buyer-${i}`} className="p-2 bg-gray-800 rounded">
                        <div className="font-semibold text-white">{name}</div>
                        <div className="text-xs text-gray-400">Buyer</div>
                      </div>
                    ))}
                    {((mergedTx as any).seller_names || '').toString().split(',').map((n:any,i:number)=>n.trim()).filter(Boolean).map((name:string,i:number)=>(
                      <div key={`seller-${i}`} className="p-2 bg-gray-800 rounded">
                        <div className="font-semibold text-white">{name}</div>
                        <div className="text-xs text-gray-400">Seller</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  <DealPartiesPanel transactionId={transaction.id} />
                )}
              </div>

              <div className="p-4 bg-gray-800 rounded">
                <h4 className="font-semibold mb-2">Checklist</h4>
                <div className="w-full bg-gray-700 h-3 rounded mb-2"><div className="h-3 bg-orange-500 rounded" style={{width: checklistProgress(checklist)+'%'}}></div></div>
                <div className="space-y-2">
                  {checklist.map((it:any)=> {
                    const dl = (dealDeadlines || []).find((d:any)=> String(d.key) === String(it.key))
                    return (
                      <div key={it.key} className="p-2 bg-gray-700 rounded flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{it.title}</div>
                          <div className="text-xs text-gray-400">{dl ? fmtDate(dl.date) : 'Not set'}</div>
                        </div>
                        <input type="checkbox" checked={it.status==='done'} onChange={async ()=>{ try{ it.status= it.status==='done'?'todo':'done'; setChecklist([...checklist]); await fetch('/api/deal-checklist', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId: transaction.id, key: it.key, status: it.status }) }); await fetch('/api/audit/log',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'checklist_toggle', resource: 'deal_checklist', resource_id: transaction.id, details: { key: it.key, new_status: it.status } }) }) }catch(e){ console.error('audit failed', e) } }} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notes section */}
              <div className="mt-4 p-4 bg-gray-800 rounded">
                <h4 className="font-semibold mb-2">Notes</h4>
                <div className="space-y-3 mb-3">
                  {notes.length===0 ? <div className="text-gray-400">No notes yet</div> : notes.map((n:any,i:number)=>(
                    <div key={n.id||i} className="p-2 bg-gray-700 rounded">
                      <div className="text-xs text-gray-400">{n.author || 'Unknown'} • {new Date(n.created_at).toLocaleString()}</div>
                      <div className="mt-1 text-sm text-white">{n.content}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add a note..." className="flex-1 bg-[#0d1b2a] p-2 rounded" />
                  <button onClick={addNote} className="px-3 py-2 bg-orange-500 rounded">Add</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deadlines mode */}
      {mode==='deadlines' && (
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

      {draftOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white text-black w-full max-w-2xl p-4 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Draft: {draftSubject || (draftKind || '')}</h3>
          <button onClick={()=>setDraftOpen(false)} className="text-sm">Close</button>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs">To</label>
            <input value={draftTo} onChange={e=>setDraftTo(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="text-xs">Subject</label>
            <input value={draftSubject} onChange={e=>setDraftSubject(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="text-xs">Body</label>
            <textarea value={draftBody} onChange={e=>setDraftBody(e.target.value)} className="w-full p-2 border rounded h-40" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={async ()=>{ await sendDraft() }} className="px-3 py-2 bg-orange-500 text-white rounded">Approve & Queue</button>
            <button onClick={()=>setDraftOpen(false)} className="px-3 py-2 bg-gray-700 text-white rounded">Cancel</button>
            <button onClick={async ()=>{ try{ if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(draftBody || ''); alert('Copied to clipboard') } }catch(e){ alert('Copy failed') } }} className="px-3 py-2 bg-gray-300 rounded">Copy</button>
          </div>
        </div>
      </div>
    </div>
  )}

  <EditTransactionModal transaction={mergedTx} open={editOpen} onClose={()=>setEditOpen(false)} onSaved={async (tx:any)=>{ try{ const res = await fetch('/api/deal-state/'+transaction.id); if(res.ok){ const j = await res.json(); setRemote(j); setMergedTx({...mergedTx, ...j}) } }catch(e){console.error(e)} }} />

  {/* Mobile Reva Drawer */}
  {mobileRevaOpen && (
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={()=>setMobileRevaOpen(false)} />
      <div className="relative w-full bg-[#061021] rounded-t-2xl p-4 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3"><img src="/reva-avatar.png" alt="Reva" className="w-10 h-10 rounded-full" /><div className="text-white font-semibold">Reva — Deal Assistant</div></div>
          <button onClick={()=>setMobileRevaOpen(false)} className="text-sm text-gray-300">Close</button>
        </div>
        <div className="h-64 overflow-auto p-2 bg-gray-800 rounded mb-3">
          {chatMessages.map((m,i)=> (
            <div key={i} className={m.from==='assistant' ? 'mb-2 text-left' : 'mb-2 text-right'}>
              <div className={`inline-block p-2 rounded ${m.from==='assistant' ? 'bg-gray-700 text-gray-100' : 'bg-orange-500 text-black'}`}>{String(m.text||'')}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input name="ask-mobile" placeholder="Ask Reva about this deal..." className="flex-1 px-3 py-2 rounded bg-gray-800 border border-white/10" onKeyDown={async (e:any)=>{ if(e.key==='Enter'){ const val = e.target.value; if(val){ await sendAIMessage(val); e.target.value=''; } } }} />
          <button onClick={async ()=>{ const inp = document.querySelector('input[name="ask-mobile"]') as HTMLInputElement|null; const val = inp?.value?.trim(); if(val){ await sendAIMessage(val); if(inp) inp.value=''; } }} className="px-4 py-2 bg-orange-500 rounded">Ask</button>
        </div>
      </div>
    </div>
  )}

      {showIntake && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-5xl mx-4">
            <ContractIntake onCancel={()=>setShowIntake(false)} onConfirm={async (parsed:any)=>{
              try{
                // save extracted to contract_store for this deal
                await fetch(`/api/deals/${transaction.id}/contract`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ extracted: parsed, pdfUrl: null }) })
                setContractData(parsed)
                // refresh docs and deal-state
                const ref = await fetch(`/api/documents/${transaction.id}`)
                if(ref.ok){ const rj = await ref.json(); setDocs(rj || []) }
                const res = await fetch(`/api/deal-state/${transaction.id}`)
                if(res.ok){ const j = await res.json(); setRemote(j); setMergedTx({...mergedTx, ...j}) }
              }catch(e){ console.error(e) }
              setShowIntake(false)
            }} />
          </div>
        </div>
      )}
    </div>
    </>
  )
}
