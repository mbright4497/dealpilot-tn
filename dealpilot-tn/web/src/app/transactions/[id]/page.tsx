/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Plus, Upload, FileText, ExternalLink, Trash2, Pencil, Phone } from 'lucide-react'

type AiSummary = {
  deal_overview?: string | null
  immediate_actions?: string[] | null
  risks?: string[] | null
  missing_info?: string[] | null
} | null

type ChecklistItem = {
  id?: string | number
  title?: string
  category?: string
  priority?: string
  due_date?: string | null
  completed?: boolean
  notes?: string | null
}

type DeadlineItem = {
  id?: string | number
  title?: string
  due_date?: string | null
  status?: 'upcoming' | 'overdue' | 'completed' | string
  critical?: boolean
  tca_reference?: string | null
}

type AiContact = {
  id?: string | number
  role?: string
  name?: string
  email?: string | null
  phone?: string | null
  company?: string | null
  ghl_contact_id?: string | null
  initials?: string | null
}

type TxDocument = {
  id: string
  name: string
  storage_path?: string | null
  status_label?: string | null
  rf_number?: string | null
  category?: string | null
  uploaded_at?: string | null
}

type TxRow = {
  id: number | string
  address?: string | null
  client?: string | null
  type?: string | null
  status?: string | null
  phase?: string | null
  binding_date?: string | null
  closing_date?: string | null
  purchase_price?: number | null
  earnest_money?: number | null
  loan_type?: string | null
  inspection_period?: string | null
  county?: string | null
  contract_pdf_url?: string | null
  ai_summary?: AiSummary
  ai_checklist?: ChecklistItem[] | null
  ai_deadlines?: DeadlineItem[] | null
  ai_contacts?: AiContact[] | null
  notes?: unknown
}

type RevaChatLine = {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
}

type PendingApproval = {
  id: string
  commType: 'email' | 'sms'
  contactRole: string
  subject?: string
  message: string
  createdAt: string
}

type CommunicationLogRow = {
  id: string
  created_at?: string | null
  channel?: string | null
  recipient?: string | null
  subject?: string | null
  body?: string | null
  message?: string | null
  status?: string | null
  delivery_status?: string | null
  delivered_at?: string | null
  contactRole?: string | null
  contactName?: string | null
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString()
}

function daysUntil(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return null
  return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

function currencyOrDash(n: unknown): string {
  if (n === null || n === undefined) return '—'
  if (typeof n === 'number' && Number.isFinite(n)) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
    } catch {
      return `$${n}`
    }
  }
  const asNum = typeof n === 'string' ? Number(n) : NaN
  if (Number.isFinite(asNum)) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asNum)
    } catch {
      return `$${asNum}`
    }
  }
  return '—'
}

function priorityPill(priority?: string | null): { label: string; className: string } {
  const p = String(priority || 'medium').toLowerCase()
  if (p === 'critical' || p === 'high') return { label: p, className: 'bg-red-500/20 text-red-200 border border-red-500/30' }
  if (p === 'low') return { label: p, className: 'bg-green-500/20 text-green-200 border border-green-500/30' }
  if (p === 'medium') return { label: p, className: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30' }
  if (p === 'urgent') return { label: p, className: 'bg-orange-500/20 text-orange-200 border border-orange-500/30' }
  return { label: p, className: 'bg-slate-500/20 text-slate-200 border border-slate-500/30' }
}

function badgeForStatus(status?: string | null): string {
  const s = String(status || 'unknown').toLowerCase()
  if (s === 'active' || s === 'under contract') return 'bg-orange-500/20 text-orange-200 border border-orange-500/30'
  if (s === 'closed') return 'bg-green-500/20 text-green-200 border border-green-500/30'
  if (s === 'pending') return 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
  if (s === 'deleted') return 'bg-red-500/20 text-red-200 border border-red-500/30'
  return 'bg-slate-500/20 text-slate-200 border border-slate-500/30'
}

function phaseBadge(phase?: string | null): string {
  const p = String(phase || 'intake').toLowerCase()
  if (p.includes('closing')) return 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
  if (p.includes('contract') || p.includes('under')) return 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
  if (p.includes('inspection')) return 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
  if (p.includes('title')) return 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
  return 'bg-orange-500/20 text-orange-200 border border-orange-500/30'
}

function dueDeadlineCardClass(item: DeadlineItem): string {
  const due = item.due_date ? new Date(item.due_date) : null
  const status = String(item.status || '').toLowerCase()
  const critical = item.critical

  if (status === 'completed') return 'border border-slate-700 bg-slate-900/60'
  if (status === 'overdue') return 'border-red-500/40 bg-red-950/40'
  if (due && !Number.isNaN(due.getTime())) {
    const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'border-red-500/40 bg-red-950/40'
    if (days <= 7) return 'border-orange-500/40 bg-orange-950/40'
    return critical ? 'border-yellow-500/30 bg-yellow-950/30' : 'border-green-500/40 bg-green-950/40'
  }
  return 'border-slate-700 bg-slate-900/70'
}

function findDocMatch(documents: TxDocument[], keywords: string[]): TxDocument | null {
  const lower = documents.map((d) => ({ d, n: String(d.name || '').toLowerCase() }))
  for (const { d, n } of lower) {
    const ok = keywords.every((k) => n.includes(k))
    if (ok) return d
  }
  // fallback: any keyword match
  for (const { d, n } of lower) {
    if (keywords.some((k) => n.includes(k))) return d
  }
  return null
}

function extractRevaAction(text: string): { cleanedReply: string; action: any | null } {
  // Greedy match like the server: action payload is a single JSON object.
  const re = /REVA_ACTION\s*:\s*(\{[\s\S]*\})/m
  const match = text.match(re)
  if (!match) return { cleanedReply: text.trim(), action: null }
  const rawJson = match[1]
  try {
    const action = JSON.parse(rawJson)
    return {
      cleanedReply: text.replace(match[0], '').trim(),
      action,
    }
  } catch {
    return { cleanedReply: text.trim(), action: null }
  }
}

function removeRevaActionFromReply(text: string): string {
  return text.replace(/REVA_ACTION\s*:\s*\{[\s\S]*\}/m, '').trim()
}

function nextWeekdayIso(weekday: number, hourLocal = 10): string {
  // weekday: 0=Sun ... 6=Sat
  const now = new Date()
  const date = new Date(now)
  date.setHours(hourLocal, 0, 0, 0)

  const diff = (weekday - date.getDay() + 7) % 7
  if (diff === 0 && date.getTime() <= now.getTime()) date.setDate(date.getDate() + 7)
  else date.setDate(date.getDate() + diff)
  return date.toISOString()
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const txId = params?.id ? Number(params.id) : NaN

  const [loading, setLoading] = useState(true)
  const [tx, setTx] = useState<TxRow | null>(null)
  const [documents, setDocuments] = useState<TxDocument[]>([])

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'checklist' | 'deadlines' | 'contacts' | 'comms'>('overview')

  const [generating, setGenerating] = useState(false)
  const [contractUploading, setContractUploading] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<Record<string, any>>({})
  const [editSaving, setEditSaving] = useState(false)

  const contractUploadRef = useRef<HTMLInputElement | null>(null)
  const docUploadRef = useRef<HTMLInputElement | null>(null)
  const docUploadTargetRef = useRef<{ title: string } | null>(null)

  // Reva panel state (always visible)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [revaMessages, setRevaMessages] = useState<RevaChatLine[]>([])
  const [revaInput, setRevaInput] = useState('')
  const [revaSending, setRevaSending] = useState(false)
  const [revaPulse, setRevaPulse] = useState(false)
  const revaInputRef = useRef<HTMLInputElement | null>(null)

  const [aiChecklist, setAiChecklist] = useState<ChecklistItem[]>([])
  const [aiDeadlines, setAiDeadlines] = useState<DeadlineItem[]>([])
  const [aiContacts, setAiContacts] = useState<AiContact[]>([])

  // Comms
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [commsHistory, setCommsHistory] = useState<CommunicationLogRow[]>([])
  const [commsLoading, setCommsLoading] = useState(false)

  const isDeleted = tx?.status === 'deleted'

  async function loadPageData() {
    if (!Number.isFinite(txId)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}`, { cache: 'no-store' })
      if (res.status === 404) {
        router.push('/transactions')
        return
      }
      if (!res.ok) throw new Error(`Failed to load transaction (${res.status})`)
      const json = await res.json()
      setTx(json?.transaction || null)
      setDocuments(Array.isArray(json?.documents) ? json.documents : [])

      const nextChecklist = Array.isArray(json?.transaction?.ai_checklist) ? (json.transaction.ai_checklist as ChecklistItem[]) : []
      const nextDeadlines = Array.isArray(json?.transaction?.ai_deadlines) ? (json.transaction.ai_deadlines as DeadlineItem[]) : []
      const nextContacts = Array.isArray(json?.transaction?.ai_contacts) ? (json.transaction.ai_contacts as AiContact[]) : []
      setAiChecklist(nextChecklist)
      setAiDeadlines(nextDeadlines)
      setAiContacts(nextContacts)
    } finally {
      setLoading(false)
    }
  }

  async function loadCommsHistory() {
    if (!Number.isFinite(txId)) return
    setCommsLoading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/communication-log`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed comms history (${res.status})`)
      const json = await res.json()
      setCommsHistory(Array.isArray(json?.history) ? json.history : [])
    } catch (e) {
      setCommsHistory([])
    } finally {
      setCommsLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData().then(() => loadCommsHistory())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId])

  useEffect(() => {
    // prime AI state when tx changes
    setAiChecklist(Array.isArray(tx?.ai_checklist) ? (tx.ai_checklist as ChecklistItem[]) : [])
    setAiDeadlines(Array.isArray(tx?.ai_deadlines) ? (tx.ai_deadlines as DeadlineItem[]) : [])
    setAiContacts(Array.isArray(tx?.ai_contacts) ? (tx.ai_contacts as AiContact[]) : [])
  }, [tx])

  const checklistPct = useMemo(() => {
    const total = aiChecklist.length
    if (!total) return 0
    const done = aiChecklist.filter((i) => Boolean(i.completed)).length
    return Math.round((done / total) * 100)
  }, [aiChecklist])

  const groupedChecklist = useMemo(() => {
    return aiChecklist.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
      const key = String(item.category || 'General')
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [aiChecklist])

  const summary = (tx?.ai_summary ?? null) as AiSummary

  const daysLeft = useMemo(() => {
    const d = daysUntil(tx?.closing_date || null)
    return d
  }, [tx?.closing_date])

  const daysLeftPillClass = useMemo(() => {
    if (daysLeft === null || daysLeft === undefined) return 'border border-slate-700 bg-slate-900/70 text-slate-200'
    if (daysLeft < 0) return 'border-red-500/50 bg-red-950/50 text-red-200'
    if (daysLeft <= 14) return 'border-red-500/40 bg-red-950/40 text-red-200'
    if (daysLeft <= 30) return 'border-orange-500/40 bg-orange-950/40 text-orange-200'
    return 'border-green-500/40 bg-green-950/40 text-green-200'
  }, [daysLeft])

  const propertyAddress = tx?.address || 'Untitled property'
  const clientName = tx?.client || '—'
  const dealType = tx?.type || tx?.client_type || '—'

  async function patchTransaction(payload: Record<string, any>) {
    if (!Number.isFinite(txId)) return
    await fetch(`/api/transactions/${txId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async function generateIntelligence() {
    if (!Number.isFinite(txId) || generating) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/analyze`, { method: 'POST' })
      if (!res.ok) throw new Error('analyze failed')
      await loadPageData()
    } finally {
      setGenerating(false)
    }
  }

  async function toggleChecklistItem(index: number) {
    const item = aiChecklist[index]
    if (!item) return
    const next = aiChecklist.map((x, i) => (i === index ? { ...x, completed: !x.completed } : x))
    setAiChecklist(next)
    try {
      await patchTransaction({ ai_checklist: next })
    } catch {
      await loadPageData()
    }
  }

  function focusRevaInput() {
    setTimeout(() => revaInputRef.current?.focus(), 0)
  }

  async function sendRevaMessage(message: string) {
    if (!Number.isFinite(txId)) return
    const trimmed = message.trim()
    if (!trimmed) return
    setRevaInput('')

    const userLine: RevaChatLine = {
      id: `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      role: 'user',
      content: trimmed,
      at: new Date().toISOString(),
    }
    setRevaMessages((prev) => [...prev, userLine])
    setRevaSending(true)

    try {
      const res = await fetch('/api/reva/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          dealId: txId,
          threadId,
        }),
      })
      const json = await res.json().catch(() => ({}))
      const replyRaw = String(json?.reply || json?.response || json?.message || '')
      const replyClean = removeRevaActionFromReply(replyRaw)
      const extracted = extractRevaAction(replyRaw)

      const nextThreadId = json?.threadId ? String(json.threadId) : threadId
      if (nextThreadId && nextThreadId !== threadId) setThreadId(nextThreadId)

      const assistantLine: RevaChatLine = {
        id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        role: 'assistant',
        content: extracted.cleanedReply || replyClean || replyRaw || 'Reva replied.',
        at: new Date().toISOString(),
      }
      setRevaMessages((prev) => [...prev, assistantLine])
      setRevaPulse(true)
      setTimeout(() => setRevaPulse(false), 4500)

      if (extracted.action) {
        void handleRevaAction(extracted.action)
      }

      // If Reva performed side effects, make the UI consistent.
      await loadPageData()
      await loadCommsHistory()
    } catch {
      setRevaMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          role: 'assistant',
          content: 'Reva is temporarily unavailable. Please try again.',
          at: new Date().toISOString(),
        },
      ])
    } finally {
      setRevaSending(false)
    }
  }

  async function handleRevaAction(action: any) {
    try {
      if (!action || typeof action !== 'object') return
      const type = String(action?.type || '')
      const data = (action?.data || {}) as Record<string, any>

      if (type === 'send_communication') {
        const commTypeRaw = String(data?.commType || data?.channel || '')
        const commType = commTypeRaw.toLowerCase().includes('sms') ? 'sms' : 'email'
        const contactRole = String(data?.contactRole || data?.role || '')
        const subject = data?.subject ? String(data.subject) : undefined
        const message = String(data?.message || data?.body || '')
        if (!contactRole || !message) return
        const next: PendingApproval = {
          id: `pend_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          commType,
          contactRole,
          subject,
          message,
          createdAt: new Date().toISOString(),
        }
        setPendingApprovals((prev) => [next, ...prev])
        setActiveTab('comms')
        return
      }

      if (type === 'create_contact') {
        const role = String(data?.role || '')
        const name = String(data?.name || data?.full_name || '')
        const email = data?.email ? String(data.email) : null
        const phone = data?.phone ? String(data.phone) : null
        if (!name || !role) return

        const newContact: AiContact = {
          id: data?.id ? String(data.id) : `local_${Date.now()}`,
          role,
          name,
          email,
          phone,
          company: data?.company ? String(data.company) : null,
        }
        const next = [...(aiContacts || []), newContact]
        setAiContacts(next)
        await patchTransaction({ ai_contacts: next })
        setActiveTab('contacts')
        return
      }

      if (type === 'update_checklist') {
        // Supports a few likely shapes: { index }, { itemId }, or { completed: true }
        const completed = data?.completed !== undefined ? Boolean(data.completed) : true
        const idx = typeof data?.index === 'number' ? data.index : null
        const itemId = data?.itemId ?? data?.checklist_item_id ?? data?.id ?? null
        let next = [...aiChecklist]
        if (idx !== null && next[idx]) {
          next[idx] = { ...next[idx], completed }
        } else if (itemId !== null) {
          next = next.map((it) => {
            const matches =
              (it.id !== undefined && String(it.id) === String(itemId)) ||
              (String(it.title || '').toLowerCase() === String(data?.title || '').toLowerCase())
            return matches ? { ...it, completed } : it
          })
        } else {
          return
        }
        setAiChecklist(next)
        await patchTransaction({ ai_checklist: next })
        setActiveTab('checklist')
        return
      }

      if (type === 'create_recurring_check_in' || type === 'schedule_check_ins' || type === 'create_recurring_schedule') {
        // Best-effort: if we can see a schedule pattern, create it. Otherwise, fall back to default M/W/F.
        const days = (data?.daysOfWeek || data?.days || data?.dayNames || []) as any[]
        const normalized = Array.isArray(days)
          ? days.map((d) => String(d).toLowerCase())
          : []
        const wantMon = normalized.includes('monday') || normalized.includes('mon')
        const wantWed = normalized.includes('wednesday') || normalized.includes('wed')
        const wantFri = normalized.includes('friday') || normalized.includes('fri')
        const weekdays = [wantMon, wantWed, wantFri].some(Boolean)
          ? [wantMon ? 1 : null, wantWed ? 3 : null, wantFri ? 5 : null].filter((x) => x !== null)
          : [1, 3, 5] // fallback: Mon/Wed/Fri (in JS Date: Mon=1, Wed=3, Fri=5)
        await scheduleMWFCheckIns({ preferredWeekdays: weekdays })
        setActiveTab('comms')
        return
      }
    } catch {
      // ignore action failures; we still reload state above.
    }
  }

  async function uploadContractToReva(file: File) {
    if (!Number.isFinite(txId)) return
    if (contractUploading) return
    setContractUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('transactionId', String(txId))

      const res = await fetch('/api/reva/extract-contract', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error('extract-contract failed')
      await loadPageData()
      await loadCommsHistory()
    } finally {
      setContractUploading(false)
    }
  }

  async function uploadGenericDocument(file: File) {
    if (!Number.isFinite(txId)) return
    const fd = new FormData()
    fd.append('file', file)
    const uploadRes = await fetch(`/api/documents/${txId}`, { method: 'POST', body: fd })
    if (!uploadRes.ok) throw new Error('upload failed')
    const uploaded = await uploadRes.json().catch(() => null)
    // Attempt quick classify based on filename to drive the RF number/category.
    try {
      const clf = await fetch('/api/documents/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name || uploaded?.name || '', text_preview: '' }),
      })
      if (clf.ok) {
        const cj = await clf.json().catch(() => null)
        if (uploaded?.id && cj?.rf_number) {
          await fetch('/api/documents/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: uploaded.id, rf_number: cj.rf_number, category: cj.category, name: cj.name || file.name }),
          })
        }
      }
    } catch {
      // classification is best-effort
    }
    await loadPageData()
  }

  async function viewDocument(doc: TxDocument) {
    if (!doc?.storage_path) return
    const res = await fetch('/api/docs/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: doc.storage_path, bucket: 'deal-documents' }),
    })
    const json = await res.json().catch(() => ({}))
    const signedUrl = json?.signedUrl
    if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteTransaction() {
    if (!Number.isFinite(txId)) return
    const ok = window.confirm('Delete this transaction? This cannot be undone.')
    if (!ok) return
    const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' })
    if (!res.ok) {
      window.alert('Delete failed.')
      return
    }
    router.push('/transactions')
  }

  const hasContract = useMemo(() => {
    if (tx?.contract_pdf_url) return true
    const psa = findDocMatch(documents, ['rf401', 'purchase', 'sale'])
    return Boolean(psa)
  }, [tx?.contract_pdf_url, documents])

  const docSections = useMemo(() => {
    return [
      {
        title: 'Intake',
        items: [
          {
            title: 'RF401 Purchase & Sale Agreement',
            required: true,
            keywords: ['rf401', 'purchase', 'sale'],
            viewLabel: 'View',
          },
        ],
      },
      {
        title: 'Under Contract',
        items: [
          { title: 'Inspection reports', required: false, keywords: ['inspection', 'report'] },
          { title: 'Appraisal', required: true, keywords: ['appraisal'] },
          { title: 'Title commitment', required: true, keywords: ['title', 'commitment'] },
          { title: 'Lender updates', required: false, keywords: ['lender', 'update'] },
        ],
      },
      {
        title: 'Closing',
        items: [
          { title: 'Closing disclosure', required: true, keywords: ['closing', 'disclosure'], type: 'closing_disclosure' as const },
          { title: 'Final walkthrough confirmation', required: false, keywords: ['walkthrough'] },
          { title: 'Settlement statement', required: true, keywords: ['settlement', 'statement'] },
          { title: 'Deed', required: true, keywords: ['deed'] },
        ],
      },
    ]
  }, [])

  const [addContactOpen, setAddContactOpen] = useState(false)
  const [newContactDraft, setNewContactDraft] = useState({ name: '', role: '', email: '', phone: '' })
  const [addContactSaving, setAddContactSaving] = useState(false)

  async function addManualContact() {
    if (!Number.isFinite(txId)) return
    const name = newContactDraft.name.trim()
    const role = newContactDraft.role.trim()
    const email = newContactDraft.email.trim()
    const phone = newContactDraft.phone.trim()
    if (!name || !role) {
      window.alert('Name and role are required.')
      return
    }
    setAddContactSaving(true)
    try {
      const next: AiContact[] = [
        ...(Array.isArray(tx?.ai_contacts) ? (tx.ai_contacts as AiContact[]) : aiContacts),
        {
          id: `local_${Date.now()}`,
          name,
          role,
          email: email || null,
          phone: phone || null,
          company: null,
        },
      ]
      setAiContacts(next)
      await patchTransaction({ ai_contacts: next })

      // Also try to link into deal_contacts so communication sending works.
      try {
        await fetch('/api/communications/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deal_id: txId,
            name,
            role,
            email: email || null,
            phone: phone || null,
          }),
        })
      } catch {
        // best-effort only
      }

      setAddContactOpen(false)
      setNewContactDraft({ name: '', role: '', email: '', phone: '' })
      setActiveTab('contacts')
    } finally {
      setAddContactSaving(false)
    }
  }

  async function approvePending(pending: PendingApproval) {
    if (!Number.isFinite(txId)) return
    // Resolve contact + recipient for this deal + role.
    const contactsRes = await fetch(`/api/communications/contacts?deal_id=${txId}`)
    const contactsJson = await contactsRes.json().catch(() => null)
    const links = Array.isArray(contactsJson?.contacts) ? contactsJson.contacts : []
    const link = links.find((l: any) => String(l.role || '').toLowerCase() === String(pending.contactRole).toLowerCase())
    if (!link) {
      window.alert(`No contact linked for role "${pending.contactRole}".`)
      return
    }
    const contactId = link?.contact_id || link?.contacts?.id
    const recipient = pending.commType === 'sms' ? link?.contacts?.phone : link?.contacts?.email
    if (!contactId || !recipient) {
      window.alert('Missing email/phone for this contact.')
      return
    }

    const sendUrl = pending.commType === 'sms' ? '/api/communications/send-sms' : '/api/communications/send-email'
    const payload: any = pending.commType === 'sms'
      ? { contact_id: contactId, deal_id: txId, recipient, message: pending.message }
      : { contact_id: contactId, deal_id: txId, recipient, subject: pending.subject || 'Deal update', message: pending.message }

    const res = await fetch(sendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      window.alert('Send failed.')
      return
    }
    setPendingApprovals((prev) => prev.filter((p) => p.id !== pending.id))
    await loadCommsHistory()
  }

  async function cancelPending(pendingId: string) {
    setPendingApprovals((prev) => prev.filter((p) => p.id !== pendingId))
  }

  async function scheduleMWFCheckIns(opts?: { preferredWeekdays?: number[] }) {
    if (!Number.isFinite(txId)) return
    // Find message template for check-ins.
    const tplRes = await fetch('/api/communications/templates?category=check_in&channel=sms')
    const tplJson = await tplRes.json().catch(() => null)
    const templates = Array.isArray(tplJson?.templates) ? tplJson.templates : []
    const tpl = templates.find((t: any) => String(t.name || '').toLowerCase().includes('48hr check-in')) || templates[0]
    const templateId = tpl?.id
    if (!templateId) return

    // Deal-linked contacts (for all parties).
    const contactsRes = await fetch(`/api/communications/contacts?deal_id=${txId}`)
    const contactsJson = await contactsRes.json().catch(() => null)
    const links = Array.isArray(contactsJson?.contacts) ? contactsJson.contacts : []
    const contactIds = links.map((l: any) => l.contact_id || l?.contacts?.id).filter(Boolean)
    if (!contactIds.length) return

    const weekdays = opts?.preferredWeekdays && opts.preferredWeekdays.length ? opts.preferredWeekdays : [1, 3, 5] // Mon/Wed/Fri
    const frequency_hours = 168
    const channels = 'sms'

    const schedulePosts: Promise<any>[] = []
    for (const cid of Array.from(new Set(contactIds))) {
      for (const wd of weekdays) {
        schedulePosts.push(
          fetch('/api/communications/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deal_id: txId,
              contact_id: cid,
              template_id: templateId,
              frequency_hours,
              channel: channels,
              next_send_at: nextWeekdayIso(wd, 10),
            }),
          }),
        )
      }
    }
    await Promise.allSettled(schedulePosts)
  }

  // Reva quick asks
  const quickAskButtons = useMemo(() => {
    return [
      { label: 'Pull up the PSA', message: 'Pull up the PSA on this deal. What is its current status and where should I find it?' },
      { label: "What's our closing date?", message: "What's our closing date on this deal? Give me the key dates in order (binding, closing) and how many days left." },
      { label: 'Text the other agent', message: 'Text the other agent on this deal. Draft a friendly, concise update and include what we need next.' },
      { label: 'Schedule M/W/F check-ins', message: 'Schedule M/W/F check-ins for this deal with all parties. Set that up for me.' },
    ]
  }, [])

  const headerRightActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setEditModalOpen(true)}
        className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-medium text-slate-200 hover:border-orange-500/40 hover:text-orange-100 transition"
      >
        Edit Deal
      </button>
      <button
        onClick={() => contractUploadRef.current?.click()}
        className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
        disabled={contractUploading}
      >
        {contractUploading ? 'Reading…' : 'Upload Contract'}
      </button>
      <button
        onClick={() => void deleteTransaction()}
        className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-medium text-red-200 hover:border-red-500/40 transition"
        aria-label="Delete transaction"
      >
        <Trash2 size={16} className="inline-block mr-2 align-text-bottom" />
        Delete
      </button>
    </div>
  )

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 text-slate-300">
        <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="h-6 w-64 bg-slate-700 rounded animate-pulse" />
            <div className="h-10 w-52 bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="h-[520px] bg-slate-900/40 rounded-xl animate-pulse" />
            <div className="h-[520px] bg-slate-900/40 rounded-xl animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  if (!tx || isDeleted) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-8">
          <h1 className="text-2xl font-bold text-red-100">Transaction deleted</h1>
          <p className="mt-2 text-slate-200">This transaction can no longer be viewed.</p>
          <button onClick={() => router.push('/transactions')} className="mt-6 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black">
            Go back
          </button>
        </div>
      </main>
    )
  }

  const contractMissing = !hasContract

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* MAIN */}
        <section className="flex-1 min-w-0">
          {/* TOP BAR */}
          <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-[18px] font-bold text-white truncate">{propertyAddress}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={classNames('rounded-full px-2.5 py-1 text-xs font-semibold border', badgeForStatus(tx.status))}>{tx.status || 'unknown'}</span>
                  <span className={classNames('rounded-full px-2.5 py-1 text-xs font-semibold border', phaseBadge(tx.phase))}>{tx.phase || 'intake'}</span>
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  <span className="font-medium text-slate-100">{clientName}</span>
                  <span className="mx-2 text-slate-500">•</span>
                  <span>{dealType}</span>
                  <span className="mx-2 text-slate-500">•</span>
                  <span className="text-orange-200 font-medium">#{txId}</span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3">
                {/* CENTER DATE PILLS */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
                    <span className="text-slate-400">Binding</span> <span className="font-semibold">{formatDate(tx.binding_date)}</span>
                  </div>
                  <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
                    <span className="text-slate-400">Closing</span> <span className="font-semibold">{formatDate(tx.closing_date)}</span>
                  </div>
                  <div className={classNames('rounded-full px-3 py-2 text-xs font-semibold border', daysLeftPillClass)}>
                    <span className="text-slate-200">Days Left</span> <span className="ml-2">{daysLeft === null ? '—' : daysLeft}</span>
                  </div>
                </div>

                {/* RIGHT ACTIONS */}
                {headerRightActions}
              </div>
            </div>

            <input
              ref={contractUploadRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadContractToReva(file)
                e.currentTarget.value = ''
              }}
            />
          </div>

          {/* TABS */}
          <nav className="mt-4 flex flex-wrap gap-2 border-b border-slate-700 pb-3">
            {(
              [
                { key: 'overview', label: 'Overview' },
                { key: 'documents', label: 'Documents' },
                { key: 'checklist', label: 'Checklist' },
                { key: 'deadlines', label: 'Deadlines' },
                { key: 'contacts', label: 'Contacts' },
                { key: 'comms', label: 'Comms' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={classNames(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  activeTab === t.key ? 'bg-orange-500 text-black' : 'bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* TAB CONTENT */}
          <div className="mt-4 space-y-4">
            {activeTab === 'overview' && (
              <>
                {/* Reva's Deal Summary card */}
                <div className="rounded-xl border border-slate-700 bg-[#111B36] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Reva's Deal Summary</h2>
                      <p className="mt-2 text-sm text-slate-200">{summary?.deal_overview || '—'}</p>
                    </div>
                    {!summary ? (
                      <button
                        onClick={() => void generateIntelligence()}
                        disabled={generating}
                        className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60 hover:bg-orange-600 transition"
                      >
                        {generating ? 'Generating…' : 'Generate Reva Intelligence'}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Immediate actions</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(summary?.immediate_actions || []).map((a, idx) => (
                          <span key={`${a}-${idx}`} className="rounded-full bg-orange-500/20 px-2.5 py-1 text-xs text-orange-200 border border-orange-500/20">
                            {a}
                          </span>
                        ))}
                        {!(summary?.immediate_actions || []).length ? <span className="text-sm text-slate-400">—</span> : null}
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Missing info</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(summary?.missing_info || []).map((a, idx) => (
                          <span key={`${a}-${idx}`} className="rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs text-yellow-200 border border-yellow-500/20">
                            {a}
                          </span>
                        ))}
                        {!(summary?.missing_info || []).length ? <span className="text-sm text-slate-400">—</span> : null}
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Risks</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(summary?.risks || []).map((a, idx) => (
                          <span key={`${a}-${idx}`} className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs text-red-200 border border-red-500/20">
                            {a}
                          </span>
                        ))}
                        {!(summary?.risks || []).length ? <span className="text-sm text-slate-400">—</span> : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Deal Info grid (2 rows x 3 cols) */}
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Purchase price</div>
                      <div className="mt-1 text-sm font-semibold text-white">{currencyOrDash(tx.purchase_price)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Earnest money</div>
                      <div className="mt-1 text-sm font-semibold text-white">{currencyOrDash(tx.earnest_money)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Loan type</div>
                      <div className="mt-1 text-sm font-semibold text-white">{tx.loan_type || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Inspection period</div>
                      <div className="mt-1 text-sm font-semibold text-white">{tx.inspection_period || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">County</div>
                      <div className="mt-1 text-sm font-semibold text-white">{tx.county || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Documents count</div>
                      <div className="mt-1 text-sm font-semibold text-white">{documents.length}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'documents' && (
              <>
                {/* Contract upload area (if no contract yet) */}
                {contractMissing ? (
                  <div className="rounded-xl border border-dashed border-orange-500/60 bg-[#0A1022] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Contract upload</h3>
                        <p className="mt-1 text-sm text-slate-200">Drag & drop your RF401 or click to browse</p>
                        <p className="mt-1 text-xs text-slate-400">Supports PDF files</p>
                      </div>
                      <button className="rounded-lg border border-orange-500/40 bg-orange-500/15 px-3 py-2 text-sm font-semibold text-orange-200 hover:bg-orange-500/25 transition" onClick={() => contractUploadRef.current?.click()}>
                        Browse
                      </button>
                    </div>

                    <div className="mt-4">
                      {contractUploading ? (
                        <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                          <Loader2 className="animate-spin text-orange-500" size={18} />
                          <div>
                            <div className="text-sm font-semibold text-white">Reva is reading the contract…</div>
                            <div className="text-xs text-slate-400">Extracting RF401 fields and updating deal intelligence.</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-200">
                          Upload the RF401 to let Reva extract key deal dates and auto-build the checklist.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Phase-based document sections */}
                <div className="space-y-4">
                  {docSections.map((sec) => (
                    <div key={sec.title} className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-white">{sec.title}</h3>
                      </div>
                      <div className="mt-3 space-y-2">
                        {sec.items.map((it) => {
                          const doc = findDocMatch(documents, it.keywords)
                          const status = doc ? 'Uploaded' : 'Missing'
                          const statusClass = doc ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                          const requiredClass = it.required
                            ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                            : 'bg-slate-700 text-slate-200 border border-slate-600'
                          const upload = async (file: File) => {
                            await uploadGenericDocument(file)
                          }

                          return (
                            <div key={it.title} className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-[#0A1022] p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <FileText size={16} className="text-orange-200" />
                                  <div className="truncate text-sm font-semibold text-white">{it.title}</div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold border', requiredClass)}>{it.required ? 'Required' : 'Conditional'}</span>
                                  {it.title.toLowerCase().includes('closing disclosure') && tx.closing_date ? (
                                    (() => {
                                      const closing = new Date(tx.closing_date!)
                                      const daysToClose = daysUntil(tx.closing_date!)
                                      const disclosureWarning = closing && daysToClose !== null && daysToClose <= 3
                                      return disclosureWarning ? (
                                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold border border-red-500/40 bg-red-950/40 text-red-200">3-day rule check</span>
                                      ) : null
                                    })()
                                  ) : null}
                                  <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold border', statusClass)}>{status}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (doc) void viewDocument(doc)
                                  }}
                                  disabled={!doc}
                                  className={classNames('rounded-lg border px-3 py-2 text-xs font-semibold transition', doc ? 'border-slate-600 bg-slate-900/60 text-slate-200 hover:border-orange-500/40' : 'border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed')}
                                >
                                  View
                                </button>

                                <button
                                  onClick={() => {
                                    docUploadTargetRef.current = { title: it.title }
                                    docUploadRef.current?.click()
                                  }}
                                  className="rounded-lg border border-orange-500/30 bg-orange-500/15 px-3 py-2 text-xs font-semibold text-orange-200 hover:bg-orange-500/25 transition"
                                >
                                  Upload
                                </button>

                                <button
                                  onClick={() => {
                                    const prompt = doc
                                      ? `Pull up "${it.title}" on this deal. Its current status is: Uploaded. Tell me the next action.`
                                      : `Pull up "${it.title}" on this deal. Its current status is: Missing. Tell me how to add it to the checklist and what to do next.`
                                    void sendRevaMessage(prompt)
                                    focusRevaInput()
                                  }}
                                  className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                                >
                                  Ask Reva
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generic doc upload input */}
                <input
                  ref={docUploadRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      void uploadGenericDocument(file)
                    }
                    e.currentTarget.value = ''
                    docUploadTargetRef.current = null
                  }}
                />
              </>
            )}

            {activeTab === 'checklist' && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-200">
                    <span className="font-semibold text-white">{aiChecklist.filter((i) => Boolean(i.completed)).length}</span> of{' '}
                    <span className="font-semibold text-white">{aiChecklist.length}</span> complete
                  </div>
                  <div className="text-xs text-slate-400">Progress: {checklistPct}%</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${checklistPct}%` }} />
                </div>

                <div className="mt-4 space-y-4">
                  {Object.entries(groupedChecklist).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-400">{category}</h3>
                      <div className="space-y-2">
                        {items.map((item, idx) => {
                          const globalIndex = aiChecklist.findIndex((x) => x === item)
                          const p = priorityPill(item.priority || 'medium')
                          return (
                            <label
                              key={`${item.id || item.title || idx}-${category}`}
                              className="flex cursor-pointer flex-col gap-2 rounded-lg border border-slate-700 bg-[#0A1022] p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={Boolean(item.completed)}
                                  onChange={() => void toggleChecklistItem(globalIndex !== -1 ? globalIndex : idx)}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white truncate">{item.title || 'Checklist item'}</div>
                                  {item.notes ? <div className="mt-1 text-xs text-slate-300">{String(item.notes)}</div> : null}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold border', p.className)}>{item.priority || 'medium'}</span>
                                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-xs font-semibold text-slate-200">
                                  Due: {formatDate(item.due_date || null)}
                                </span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {!aiChecklist.length ? <p className="text-sm text-slate-400">No checklist items yet.</p> : null}
                </div>
              </div>
            )}

            {activeTab === 'deadlines' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-white">Deadlines</h2>
                    {!aiDeadlines.length ? (
                      <button
                        onClick={() => void generateIntelligence()}
                        disabled={generating}
                        className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60 hover:bg-orange-600 transition"
                      >
                        {generating ? 'Generating…' : 'Generate Intelligence'}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {aiDeadlines.map((d, idx) => {
                      const delta = daysUntil(d.due_date || null)
                      const isOverdue = delta !== null && delta < 0
                      const isDueSoon = delta !== null && delta >= 0 && delta <= 7
                      const daysText =
                        delta === null
                          ? '—'
                          : isOverdue
                            ? `${Math.abs(delta)} days overdue`
                            : delta === 0
                              ? 'Due today'
                              : `${delta} days remaining`
                      return (
                        <div key={`${d.id || idx}-${d.title || 'deadline'}`} className={classNames('rounded-lg border p-4', dueDeadlineCardClass(d))}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="font-semibold text-white">{d.title || 'Deadline item'}</div>
                              <div className="mt-1 text-xs text-slate-300">Due: {formatDate(d.due_date || null)}</div>
                              <div className="mt-1 text-xs font-semibold text-orange-200">{daysText}</div>
                              {d.tca_reference ? <div className="mt-1 text-xs text-slate-400">TCA: {d.tca_reference}</div> : null}
                              {isDueSoon ? <div className="mt-1 text-xs text-orange-200">Due soon — lock in the next step.</div> : null}
                              {isOverdue ? <div className="mt-1 text-xs text-red-200">Overdue — act today.</div> : null}
                            </div>

                            <button
                              onClick={() => {
                                const prompt = `Tell me about the ${d.title || 'deadline'} deadline on this deal. What is the next action I should take?`
                                setRevaInput(prompt)
                                void sendRevaMessage(prompt)
                              }}
                              className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                            >
                              Ask Reva
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {!aiDeadlines.length ? <p className="text-sm text-slate-400 mt-2">No deadlines yet.</p> : null}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-white">Contacts</h2>
                  <button onClick={() => setAddContactOpen(true)} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition">
                    <Plus size={16} className="inline-block mr-2 align-text-bottom" />
                    Add Contact
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {aiContacts.map((c, idx) => {
                    const role = c.role || 'Contact'
                    const name = c.name || 'Unnamed contact'
                    const initials = c.initials || name.split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '—'
                    const hasGhl = Boolean(c.ghl_contact_id)
                    return (
                      <div key={`${c.id || name}-${idx}`} className="rounded-xl border border-slate-700 bg-[#0A1022] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                              <span className="text-sm font-bold text-orange-200">{initials}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{name}</div>
                              <div className="mt-1 text-xs uppercase tracking-wide text-orange-200">{role}</div>
                            </div>
                          </div>
                          <div className={classNames('rounded-full px-2 py-1 text-xs font-semibold border', hasGhl ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-slate-700 bg-slate-900/60 text-slate-300')}>
                            {hasGhl ? 'GHL connected' : 'Not connected'}
                          </div>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-300">
                          <div>Email: <span className="text-slate-100">{c.email || '—'}</span></div>
                          <div>Phone: <span className="text-slate-100">{c.phone || '—'}</span></div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              const prompt = `Draft a text message to ${name} (${role}) about this transaction. Keep it concise and practical.`
                              setActiveTab('comms')
                              void sendRevaMessage(prompt)
                            }}
                            className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                          >
                            Text via Reva
                          </button>
                          <button
                            onClick={() => {
                              const prompt = `Draft an email to ${name} (${role}) about this transaction. Include the key next step and dates.`
                              setActiveTab('comms')
                              void sendRevaMessage(prompt)
                            }}
                            className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                          >
                            Email via Reva
                          </button>
                          <a
                            href={c.phone ? `tel:${c.phone}` : undefined}
                            onClick={(e) => {
                              if (!c.phone) {
                                e.preventDefault()
                                window.alert('No phone number available for this contact.')
                              }
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-orange-500/40 transition"
                          >
                            <Phone size={14} className="inline-block mr-2 align-text-bottom" />
                            Call
                          </a>
                        </div>
                      </div>
                    )
                  })}
                  {!aiContacts.length ? <p className="text-sm text-slate-400">No contacts listed yet.</p> : null}
                </div>
              </div>
            )}

            {activeTab === 'comms' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-white">Communications</h2>
                  <button
                    onClick={() => {
                      const prompt =
                        'For this deal, I want you to check in with all parties every Monday, Wednesday, and Friday. Set that up for me.'
                      setRevaInput(prompt)
                      focusRevaInput()
                      void sendRevaMessage(prompt)
                    }}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition"
                  >
                    Ask Reva to schedule check-ins
                  </button>
                </div>

                {/* Pending approvals */}
                {pendingApprovals.length ? (
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Pending approval</div>
                    {pendingApprovals.map((p) => (
                      <div key={p.id} className="rounded-xl border border-slate-700 bg-[#0A1022] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-yellow-500/40 bg-yellow-950/40 px-2 py-1 text-xs font-semibold text-yellow-200">
                                Pending approval
                              </span>
                              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs font-semibold text-slate-200">
                                {p.commType.toUpperCase()}
                              </span>
                              <span className="text-xs text-orange-200 font-semibold">Role: {p.contactRole}</span>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white truncate">{p.subject || 'No subject'}</div>
                            <div className="mt-1 text-xs text-slate-300">
                              {p.message.length > 140 ? p.message.slice(0, 140) + '…' : p.message}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => void approvePending(p)}
                              className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-black hover:bg-orange-600 transition"
                            >
                              Approve & Send
                            </button>
                            <button
                              onClick={() => {
                                const nextMessage = window.prompt('Edit message:', p.message)
                                if (nextMessage === null) return
                                setPendingApprovals((prev) => prev.map((x) => (x.id === p.id ? { ...x, message: nextMessage } : x)))
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                            >
                              <Pencil size={14} className="inline-block mr-2 align-text-bottom" />
                              Edit
                            </button>
                            <button
                              onClick={() => void cancelPending(p.id)}
                              className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 hover:border-red-500/60 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Sent / delivered log */}
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Sent / delivered</div>
                  {commsLoading ? (
                    <div className="rounded-xl border border-slate-700 bg-[#0A1022] p-4 text-slate-300">Loading…</div>
                  ) : commsHistory.length ? (
                    <div className="space-y-2">
                      {commsHistory.map((e) => {
                        const createdAt = e.created_at || null
                        const ts = createdAt ? new Date(createdAt).toLocaleString() : '—'
                        const channel = String(e.channel || '').toLowerCase()
                        const type = channel.includes('sms') ? 'SMS' : channel.includes('email') ? 'Email' : 'Message'

                        const statusRaw = String(e.status || '').toLowerCase()
                        const delivered = Boolean(e.delivered_at) || e.delivery_status === 'delivered' || statusRaw === 'delivered'
                        const pending = statusRaw === 'draft' || statusRaw === 'queued'
                        const statusLabel = pending ? 'Pending approval' : delivered ? 'Delivered' : statusRaw === 'failed' ? 'Failed' : statusRaw === 'received' ? 'Received' : 'Sent'

                        const msg = e.body || e.message || ''
                        return (
                          <div key={e.id} className="rounded-xl border border-slate-700 bg-[#0A1022] p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={classNames('rounded-full px-2 py-1 text-xs font-semibold border', pending ? 'border-yellow-500/40 bg-yellow-950/40 text-yellow-200' : delivered ? 'border-green-500/40 bg-green-950/40 text-green-200' : 'border-slate-700 bg-slate-900/60 text-slate-200')}>
                                    {statusLabel}
                                  </span>
                                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs font-semibold text-slate-200">{type}</span>
                                  <span className="text-xs text-orange-200 font-semibold truncate max-w-[220px]">
                                    {e.contactName || e.recipient || 'Recipient'} {e.contactRole ? `(${e.contactRole})` : ''}
                                  </span>
                                </div>
                                <div className="mt-2 text-sm font-semibold text-white truncate">{e.subject || '—'}</div>
                                <div className="mt-1 text-xs text-slate-300">{msg ? (msg.length > 160 ? msg.slice(0, 160) + '…' : msg) : '—'}</div>
                              </div>
                              <div className="text-xs text-slate-400">{ts}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center text-slate-300">
                      No communications yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* REVA PANEL */}
        <aside className="w-full lg:w-[360px]">
          <div className="sticky top-4 rounded-2xl border border-slate-700 bg-[#071827] overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 bg-[#0B1530] p-4">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/avatar-pilot.png"
                  alt="Reva"
                  style={{ width: 36, height: 36, borderRadius: 50, objectFit: 'cover', border: '2px solid #F97316' }}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">Reva</div>
                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                    Online · Deal-aware
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setRevaMessages([])
                  setThreadId(null)
                }}
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                title="Reset conversation"
              >
                Reset
              </button>
            </div>

            {/* Quick asks */}
            <div className="p-4 border-b border-slate-700 bg-[#0A1022]">
              <div className="grid grid-cols-1 gap-2">
                <div className="text-xs uppercase tracking-wide text-slate-400">Quick asks</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {quickAskButtons.map((b) => (
                    <button
                      key={b.label}
                      onClick={() => void sendRevaMessage(b.message)}
                      disabled={revaSending}
                      className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition disabled:opacity-60"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message area */}
            <div className="p-4">
              <div className="h-[52vh] max-h-[560px] overflow-y-auto space-y-3 pr-1">
                {revaMessages.length ? (
                  revaMessages.map((m) => (
                    <div key={m.id} className={classNames('rounded-xl p-3 text-sm', m.role === 'assistant' ? 'bg-[#0B1530] text-slate-100 border border-slate-800' : 'bg-orange-500/20 text-orange-100 border border-orange-500/30')}>
                      <div className="text-xs text-slate-400">{m.role === 'assistant' ? 'Reva' : 'You'}</div>
                      <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-[#0B1530] p-4 text-sm text-slate-300">
                    Ask Reva anything about this deal. She is deal-aware and will keep it actionable.
                  </div>
                )}
                {revaSending ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="animate-spin text-orange-500" size={16} />
                    Reva is typing…
                  </div>
                ) : null}
              </div>
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-slate-700 bg-[#0A1022]">
              <div className="flex items-center gap-2">
                <input
                  ref={revaInputRef}
                  value={revaInput}
                  onChange={(e) => setRevaInput(e.target.value)}
                  placeholder="Ask Reva anything about this deal..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendRevaMessage(revaInput)
                    }
                  }}
                />
                <button
                  onClick={() => void sendRevaMessage(revaInput)}
                  disabled={revaSending || !revaInput.trim()}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
                >
                  Send
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-400">Tip: ask about documents, deadlines, and communications.</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Reva indicator (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <style jsx>{`
          @keyframes revaPulseRing {
            0% {
              transform: scale(1);
              opacity: 0.95;
            }
            50% {
              transform: scale(1.08);
              opacity: 0.55;
            }
            100% {
              transform: scale(1);
              opacity: 0.95;
            }
          }
        `}</style>
        <button
          onClick={() => focusRevaInput()}
          className={classNames('rounded-full overflow-hidden border-2 border-orange-500 bg-transparent', revaPulse ? 'animate-[revaPulseRing_1.6s_ease-in-out_infinite]' : '')}
          style={{ width: 44, height: 44 }}
          aria-label="Reva indicator"
          title="Reva"
        >
          <img
            src="/avatar-pilot.png"
            alt="Reva"
            style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover' }}
          />
        </button>
      </div>

      {/* EDIT DEAL MODAL (minimal) */}
      {editModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#071827] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-white">Edit Deal</div>
                <div className="mt-1 text-xs text-slate-400">Make quick updates to your deal fields.</div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40 transition">
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: 'status', label: 'Status', value: tx.status || '' },
                { key: 'phase', label: 'Phase', value: tx.phase || '' },
                { key: 'binding_date', label: 'Binding date', value: tx.binding_date ? String(tx.binding_date).slice(0, 10) : '' },
                { key: 'closing_date', label: 'Closing date', value: tx.closing_date ? String(tx.closing_date).slice(0, 10) : '' },
                { key: 'purchase_price', label: 'Purchase price', value: tx.purchase_price ?? '' },
                { key: 'earnest_money', label: 'Earnest money', value: tx.earnest_money ?? '' },
                { key: 'loan_type', label: 'Loan type', value: tx.loan_type || '' },
                { key: 'inspection_period', label: 'Inspection period', value: tx.inspection_period || '' },
                { key: 'county', label: 'County', value: tx.county || '' },
              ].map((f) => (
                <label key={f.key} className="text-sm text-slate-200">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{f.label}</div>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
                    value={editDraft[f.key] ?? f.value}
                    onChange={(e) => setEditDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditModalOpen(false)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40 transition">
                Cancel
              </button>
              <button
                disabled={editSaving}
                onClick={async () => {
                  setEditSaving(true)
                  try {
                    const payload: Record<string, any> = { ...editDraft }
                    await patchTransaction(payload)
                    setEditModalOpen(false)
                    setEditDraft({})
                    await loadPageData()
                  } finally {
                    setEditSaving(false)
                  }
                }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ADD CONTACT MODAL */}
      {addContactOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#071827] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-white">Add Contact</div>
                <div className="mt-1 text-xs text-slate-400">Saved to your deal intelligence contacts and linked for communications.</div>
              </div>
              <button onClick={() => setAddContactOpen(false)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40 transition">
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {[
                { key: 'name', label: 'Name', placeholder: 'e.g. Alex Johnson' },
                { key: 'role', label: 'Role', placeholder: 'e.g. lender, title, inspector' },
                { key: 'email', label: 'Email', placeholder: 'e.g. alex@example.com' },
                { key: 'phone', label: 'Phone', placeholder: 'e.g. (555) 123-4567' },
              ].map((f) => (
                <label key={f.key} className="text-sm text-slate-200">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{f.label}</div>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                    value={(newContactDraft as any)[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setNewContactDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setAddContactOpen(false)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40 transition">
                Cancel
              </button>
              <button
                disabled={addContactSaving}
                onClick={() => void addManualContact()}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
              >
                {addContactSaving ? 'Saving…' : 'Save Contact'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

