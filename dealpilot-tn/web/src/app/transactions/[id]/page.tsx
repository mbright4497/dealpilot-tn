'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, Loader2, Phone, Trash2, Upload } from 'lucide-react'

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
}

type RevaChatLine = {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
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
  if (Number.isFinite(asNum)) return `$${asNum}`
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

function findDocMatch(documents: TxDocument[], keywords: string[]): TxDocument | null {
  const all = documents || []
  const normalized = keywords.map((k) => k.toLowerCase())
  return (
    all.find((d) => {
      const hay = `${d.name || ''} ${(d.status_label || '')} ${(d.category || '')} ${(d.rf_number || '')}`.toLowerCase()
      return normalized.some((k) => hay.includes(k))
    }) || null
  )
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const txId = params?.id ? Number(params.id) : NaN

  const [loading, setLoading] = useState(true)
  const [tx, setTx] = useState<TxRow | null>(null)
  const [documents, setDocuments] = useState<TxDocument[]>([])

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'checklist' | 'deadlines' | 'contacts' | 'comms'>(
    'overview'
  )

  const [aiChecklist, setAiChecklist] = useState<ChecklistItem[]>([])
  const [aiDeadlines, setAiDeadlines] = useState<DeadlineItem[]>([])
  const [aiContacts, setAiContacts] = useState<AiContact[]>([])

  const summary = useMemo(() => (tx?.ai_summary ?? null) as AiSummary, [tx])

  const [commHistoryLoading, setCommHistoryLoading] = useState(false)
  const [commsHistory, setCommsHistory] = useState<any[]>([])

  // Reva panel state (permanent on right)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [revaMessages, setRevaMessages] = useState<RevaChatLine[]>([])
  const [revaInput, setRevaInput] = useState('')
  const [revaSending, setRevaSending] = useState(false)
  const revaInputRef = useRef<HTMLInputElement | null>(null)
  const revaScrollRef = useRef<HTMLDivElement | null>(null)

  const [contractUploading, setContractUploading] = useState(false)
  const contractUploadRef = useRef<HTMLInputElement | null>(null)

  const contractMissing = useMemo(() => {
    if (!tx) return true
    if (tx.contract_pdf_url) return false
    // Best-effort: treat any "contract-ish" document name as present.
    return !findDocMatch(documents, ['contract', 'agreement', 'purchase', 'sale', 'psa'])
  }, [tx, documents])

  const daysLeft = useMemo(() => daysUntil(tx?.closing_date || null), [tx?.closing_date])
  const daysLeftPillClass = useMemo(() => {
    if (daysLeft === null || daysLeft === undefined) return 'border border-slate-700 bg-slate-900/70 text-slate-200'
    if (daysLeft < 0) return 'border-red-500/50 bg-red-950/50 text-red-200'
    if (daysLeft <= 14) return 'border-red-500/40 bg-red-950/40 text-red-200'
    if (daysLeft <= 30) return 'border-orange-500/40 bg-orange-950/40 text-orange-200'
    return 'border-green-500/40 bg-green-950/40 text-green-200'
  }, [daysLeft])

  const propertyAddress = tx?.address || 'Untitled property'
  const clientName = tx?.client || '—'
  const dealType = tx?.type || '—'
  const bindingLabel = formatDate(tx?.binding_date)
  const closingLabel = formatDate(tx?.closing_date)

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
      setTx((json?.transaction as TxRow) || null)
      setDocuments(Array.isArray(json?.documents) ? (json.documents as TxDocument[]) : [])
    } finally {
      setLoading(false)
    }
  }

  async function loadCommsHistory() {
    if (!Number.isFinite(txId)) return
    setCommHistoryLoading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/communication-log`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed comms history (${res.status})`)
      const json = await res.json()
      setCommsHistory(Array.isArray(json?.history) ? json.history : [])
    } catch {
      setCommsHistory([])
    } finally {
      setCommHistoryLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData().then(() => loadCommsHistory())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId])

  // Prime AI state after tx load
  useEffect(() => {
    setAiChecklist(Array.isArray(tx?.ai_checklist) ? (tx.ai_checklist as ChecklistItem[]) : [])
    setAiDeadlines(Array.isArray(tx?.ai_deadlines) ? (tx.ai_deadlines as DeadlineItem[]) : [])
    setAiContacts(Array.isArray(tx?.ai_contacts) ? (tx.ai_contacts as AiContact[]) : [])
  }, [tx])

  useEffect(() => {
    // keep Reva scrolled to bottom as messages change
    try {
      if (revaScrollRef.current) revaScrollRef.current.scrollTop = revaScrollRef.current.scrollHeight
    } catch {
      // ignore
    }
  }, [revaMessages, revaSending])

  async function patchTransaction(payload: Record<string, any>) {
    if (!Number.isFinite(txId)) return
    await fetch(`/api/transactions/${txId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async function generateIntelligence() {
    if (!Number.isFinite(txId)) return
    await fetch(`/api/transactions/${txId}/analyze`, { method: 'POST' })
    await loadPageData()
    await loadCommsHistory()
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

  async function uploadContractToReva(file: File) {
    if (!Number.isFinite(txId)) return
    if (contractUploading) return
    setContractUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('transactionId', String(txId))
      const res = await fetch('/api/reva/extract-contract', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('extract-contract failed')
      await loadPageData()
      await loadCommsHistory()
    } finally {
      setContractUploading(false)
    }
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

  function focusRevaInput() {
    setTimeout(() => revaInputRef.current?.focus(), 0)
  }

  async function sendRevaMessage(message: string) {
    const trimmed = message.trim()
    if (!trimmed) return
    if (!Number.isFinite(txId)) return
    if (revaSending) return

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
      const replyRaw = String(json?.reply || json?.response || json?.message || '').trim()
      const assistantLine: RevaChatLine = {
        id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        role: 'assistant',
        content: replyRaw || 'Reva replied.',
        at: new Date().toISOString(),
      }
      setRevaMessages((prev) => [...prev, assistantLine])

      if (json?.threadId) setThreadId(String(json.threadId))
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
      focusRevaInput()
    }
  }

  function overviewTab() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-[#111B36] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Reva Summary</h2>
              <p className="mt-2 text-sm text-slate-200">{summary?.deal_overview || '—'}</p>
            </div>
            {!summary ? (
              <button
                onClick={() => void generateIntelligence()}
                className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
              >
                Generate Intelligence
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Purchase price</div>
              <div className="mt-1 text-sm font-semibold text-white">{currencyOrDash(tx?.purchase_price)}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Earnest money</div>
              <div className="mt-1 text-sm font-semibold text-white">{currencyOrDash(tx?.earnest_money)}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Loan type</div>
              <div className="mt-1 text-sm font-semibold text-white">{tx?.loan_type || '—'}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Inspection period</div>
              <div className="mt-1 text-sm font-semibold text-white">{tx?.inspection_period || '—'}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">County</div>
              <div className="mt-1 text-sm font-semibold text-white">{tx?.county || '—'}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Documents count</div>
              <div className="mt-1 text-sm font-semibold text-white">{documents.length}</div>
            </div>
          </div>
        </div>

        {summary?.immediate_actions?.length ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Immediate actions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.immediate_actions.map((a, idx) => (
                <span key={`${a}-${idx}`} className="rounded-full border border-orange-500/20 bg-orange-500/20 px-2.5 py-1 text-xs text-orange-200">
                  {a}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  function documentsTab() {
    return (
      <div className="space-y-4">
        {contractMissing ? (
          <div className="rounded-xl border border-dashed border-orange-500/60 bg-[#0A1022] p-5">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="text-sm font-semibold text-white">Contract upload</h3>
                <p className="mt-1 text-sm text-slate-200">Upload the contract document so Reva can extract key details.</p>
                <p className="mt-1 text-xs text-slate-400">Supports PDF files</p>
              </div>
              <button
                onClick={() => contractUploadRef.current?.click()}
                disabled={contractUploading}
                className="inline-flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/15 px-3 py-2 text-sm font-semibold text-orange-200 hover:bg-orange-500/25 transition disabled:opacity-60"
              >
                {contractUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload Contract
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Documents</h2>
            <span className="text-xs text-slate-400">{documents.length} total</span>
          </div>

          {!documents.length ? <p className="mt-3 text-sm text-slate-400">No documents uploaded yet.</p> : null}

          <div className="mt-3 space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-[#0A1022] p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-orange-200" />
                    <div className="truncate text-sm font-semibold text-white">{d.name}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Uploaded: {formatDate(d.uploaded_at)} {d.status_label ? `• ${d.status_label}` : null}
                  </div>
                </div>

                <button
                  onClick={() => {
                    void sendRevaMessage(`Open and summarize "${d.name}" for this transaction. Tell me what's relevant and the next action.`);
                  }}
                  className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                >
                  Ask Reva
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function checklistTab() {
    const total = aiChecklist.length
    const done = aiChecklist.filter((i) => Boolean(i.completed)).length
    const pct = total ? Math.round((done / total) * 100) : 0

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-200">
              <span className="font-semibold text-white">{done}</span> of <span className="font-semibold text-white">{total}</span> complete
            </div>
            <div className="text-xs text-slate-400">Progress: {pct}%</div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          {!aiChecklist.length ? (
            <p className="text-sm text-slate-400">No checklist items yet.</p>
          ) : (
            <div className="space-y-2">
              {aiChecklist.map((item, idx) => {
                const p = priorityPill(item.priority || 'medium')
                return (
                  <label
                    key={`${item.id || item.title || idx}-${String(item.category || 'General')}`}
                    className="flex cursor-pointer flex-col gap-2 rounded-lg border border-slate-700 bg-[#0A1022] p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1" checked={Boolean(item.completed)} onChange={() => void toggleChecklistItem(idx)} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{item.title || 'Checklist item'}</div>
                        {item.notes ? <div className="mt-1 text-xs text-slate-300">{String(item.notes)}</div> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold border', p.className)}>{item.priority || p.label}</span>
                      <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-xs font-semibold text-slate-200">
                        Due: {formatDate(item.due_date || null)}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  function deadlinesTab() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Deadlines</h2>
            {!aiDeadlines.length ? (
              <button onClick={() => void generateIntelligence()} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition">
                Generate Intelligence
              </button>
            ) : null}
          </div>

          {!aiDeadlines.length ? <p className="mt-3 text-sm text-slate-400">No deadlines yet.</p> : null}

          <div className="mt-3 space-y-2">
            {aiDeadlines.map((d, idx) => {
              const delta = daysUntil(d.due_date || null)
              const isOverdue = delta !== null && delta < 0
              const isDueSoon = delta !== null && delta >= 0 && delta <= 7
              const daysText = delta === null ? '—' : isOverdue ? `${Math.abs(delta)} days overdue` : delta === 0 ? 'Due today' : `${delta} days remaining`

              return (
                <div key={`${d.id || idx}-${d.title || 'deadline'}`} className="rounded-lg border border-slate-700 bg-[#0A1022] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-semibold text-white">{d.title || 'Deadline item'}</div>
                      <div className="mt-1 text-xs text-slate-300">Due: {formatDate(d.due_date || null)}</div>
                      <div className={classNames('mt-1 text-xs font-semibold', isOverdue ? 'text-red-200' : isDueSoon ? 'text-orange-200' : 'text-slate-200')}>{daysText}</div>
                      {d.tca_reference ? <div className="mt-1 text-xs text-slate-400">TCA: {d.tca_reference}</div> : null}
                    </div>
                    <button
                      onClick={() => {
                        const prompt = `For this transaction, what is the next best action for the deadline "${d.title || 'deadline'}" and why? Include suggested follow-ups.`
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
          </div>
        </div>
      </div>
    )
  }

  function contactsTab() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Contacts</h2>
            <span className="text-xs text-slate-400">{aiContacts.length} total</span>
          </div>

          {!aiContacts.length ? (
            <p className="mt-3 text-sm text-slate-400">No contacts listed yet.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {aiContacts.map((c, idx) => {
                const role = c.role || 'Contact'
                const name = c.name || 'Unnamed contact'
                const initials =
                  c.initials ||
                  name
                    .split(' ')
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join('') ||
                  '—'

                return (
                  <div key={`${c.id || name}-${idx}`} className="rounded-xl border border-slate-700 bg-[#0A1022] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <span className="text-sm font-bold text-orange-200">{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{name}</div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-orange-200">{role}</div>
                        </div>
                      </div>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition inline-flex items-center gap-1"
                        >
                          <Phone size={14} />
                          Call
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-3 text-xs text-slate-300">
                      <div>Email: <span className="text-slate-100">{c.email || '—'}</span></div>
                      <div className="mt-1">Phone: <span className="text-slate-100">{c.phone || '—'}</span></div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => void sendRevaMessage(`Draft a text message to ${name} (${role}) with the next step and relevant dates for this transaction.`)}
                        className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                      >
                        Text via Reva
                      </button>
                      <button
                        onClick={() => void sendRevaMessage(`Draft an email to ${name} (${role}) about this transaction. Include the key next step and dates.`)}
                        className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                      >
                        Email via Reva
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  function commsTab() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Comms</h2>
            <button
              onClick={() => void loadCommsHistory()}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40 transition disabled:opacity-60"
              disabled={commHistoryLoading}
            >
              {commHistoryLoading ? <Loader2 size={16} className="animate-spin" /> : 'Refresh'}
            </button>
          </div>

          {!commsHistory.length ? (
            <p className="mt-3 text-sm text-slate-400">{commHistoryLoading ? 'Loading…' : 'No communication history yet.'}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {commsHistory.map((h) => (
                <div key={String(h.id)} className="rounded-lg border border-slate-700 bg-[#0A1022] p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      {String(h.channel || h.commType || '—').toUpperCase()}
                      {h.contactRole ? ` • ${String(h.contactRole)}` : null}
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(h.created_at)}</div>
                  </div>
                  {h.subject ? <div className="mt-2 text-sm font-semibold text-white">{h.subject}</div> : null}
                  {h.body || h.message ? (
                    <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                      {String(h.body || h.message)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 text-slate-300">
        <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="h-6 w-64 bg-slate-700 rounded animate-pulse" />
            <div className="h-10 w-52 bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
            <div className="h-[520px] bg-slate-900/40 rounded-xl animate-pulse" />
            <div className="h-[520px] bg-slate-900/40 rounded-xl animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[70%_30%]">
        <section className="min-w-0">
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

          {/* Top bar */}
          <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-[18px] font-bold text-white">{propertyAddress}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={classNames('rounded-full px-2.5 py-1 text-xs font-semibold border', badgeForStatus(tx?.status))}>
                    {tx?.status || 'unknown'}
                  </span>
                  <span className={classNames('rounded-full px-2.5 py-1 text-xs font-semibold border', phaseBadge(tx?.phase))}>
                    {tx?.phase || 'intake'}
                  </span>
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
                {/* Dates */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
                    <span className="text-slate-400">Binding</span> <span className="font-semibold">{bindingLabel}</span>
                  </div>
                  <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
                    <span className="text-slate-400">Closing</span> <span className="font-semibold">{closingLabel}</span>
                  </div>
                  <div className={classNames('rounded-full px-3 py-2 text-xs font-semibold border', daysLeftPillClass)}>
                    <span className="text-slate-200">Days Left</span> <span className="ml-2">{daysLeft === null ? '—' : daysLeft}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const current = String((tx as any)?.notes || '')
                      const next = window.prompt('Edit deal notes (optional):', current)
                      if (next === null) return
                      void patchTransaction({ notes: next })
                      void loadPageData()
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-medium text-slate-200 hover:border-orange-500/40 hover:text-orange-100 transition"
                  >
                    Edit Deal
                  </button>
                  <button
                    onClick={() => contractUploadRef.current?.click()}
                    disabled={contractUploading}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
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
              </div>
            </div>
          </div>

          {/* Tabs */}
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

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'overview' ? overviewTab() : null}
            {activeTab === 'documents' ? documentsTab() : null}
            {activeTab === 'checklist' ? checklistTab() : null}
            {activeTab === 'deadlines' ? deadlinesTab() : null}
            {activeTab === 'contacts' ? contactsTab() : null}
            {activeTab === 'comms' ? commsTab() : null}
          </div>
        </section>

        {/* Reva panel (permanent right) */}
        <aside className="min-w-0">
          <div className="sticky top-4 rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Reva</h2>
              <span className="text-xs text-slate-400">{revaSending ? 'Sending…' : 'Ready'}</span>
            </div>

            <div ref={revaScrollRef} className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
              {revaMessages.length ? (
                revaMessages.map((m) => (
                  <div key={m.id} className={classNames('rounded-xl p-3 border', m.role === 'user' ? 'border-orange-500/20 bg-orange-500/10' : 'border-slate-700 bg-slate-900/40')}>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{m.role === 'user' ? 'You' : 'Reva'}</div>
                    <div className="mt-1 text-sm whitespace-pre-wrap text-slate-200">{m.content}</div>
                    <div className="mt-2 text-[11px] text-slate-400">{formatDate(m.at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-300">
                  Ask Reva about this transaction. Example: “What’s the next best action?”
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                ref={revaInputRef}
                value={revaInput}
                onChange={(e) => setRevaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void sendRevaMessage(revaInput)
                }}
                placeholder="Type a message…"
                className="w-full rounded-lg bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700"
              />
              <button
                onClick={() => void sendRevaMessage(revaInput)}
                disabled={revaSending}
                className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
              >
                {revaSending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

