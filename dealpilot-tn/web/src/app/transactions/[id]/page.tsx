'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Phone, Trash2, Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import DocumentAirDrop from '@/components/ui/DocumentAirDrop'
import {
  DOCUMENT_TYPE_OPTIONS,
} from '@/lib/documents/transactionDocumentTypes'
import {
  DocPhase,
  TN_DOCUMENT_CHECKLIST,
  TNDocumentSlot,
  getSlotsByPhase,
} from '@/lib/documents/tnDocumentChecklist'

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

type TransactionDocumentRow = {
  id: number
  document_type: string
  display_name: string
  created_at?: string
  status?: string | null
  file_url?: string | null
  signed_url?: string | null
  is_executed?: boolean
  broker_review?: {
    natural_language_summary?: string
    issues?: { severity: string; message: string; field?: string }[]
    checks?: { id?: string; name?: string; status?: string; detail?: string }[]
  } | null
  extracted_data?: Record<string, unknown> | null
  deal_impact?: {
    address_mismatch?: {
      contract_address: string
      transaction_address: string
      mismatch: true
    }
    [key: string]: unknown
  } | null
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
  activity_log?: ActivityItem[] | null
  updated_at?: string | null
}

type ActivityItem = {
  icon?: string
  description: string
  timestamp: string
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

function normalizePhase(raw?: string | null): DocPhase {
  const phase = String(raw || '').toLowerCase()
  if (phase.includes('closing')) return 'closing'
  if (phase.includes('contract') || phase.includes('under')) return 'under_contract'
  return 'pre_contract'
}

function phaseTitle(phase: DocPhase): string {
  if (phase === 'pre_contract') return 'PRE-CONTRACT'
  if (phase === 'under_contract') return 'UNDER CONTRACT'
  return 'CLOSING'
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const txId = params?.id ? Number(params.id) : NaN

  const [loading, setLoading] = useState(true)
  const [tx, setTx] = useState<TxRow | null>(null)
  const [txDocuments, setTxDocuments] = useState<TransactionDocumentRow[]>([])
  const [docTypePick, setDocTypePick] = useState('rf401_psa')
  const [customDocName, setCustomDocName] = useState('')
  const [isExecutedToggle, setIsExecutedToggle] = useState(false)
  const [txDocUploadBusy, setTxDocUploadBusy] = useState(false)
  const [rowUploadingSlotId, setRowUploadingSlotId] = useState<string | null>(null)
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null)
  const [airdropVisible, setAirdropVisible] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(true)
  const [airdropName, setAirdropName] = useState('')
  const [airdropWatchId, setAirdropWatchId] = useState<number | null>(null)
  const [reviewDoc, setReviewDoc] = useState<TransactionDocumentRow | null>(null)
  const [addressMismatch, setAddressMismatch] = useState<{
    docId: number
    contract_address: string
    transaction_address: string
  } | null>(null)
  const [addressMismatchBusy, setAddressMismatchBusy] = useState(false)
  const [showAddressMismatchModal, setShowAddressMismatchModal] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const addressMismatchDismissed = useRef<Set<number>>(new Set())
  const rowUploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'checklist' | 'deadlines' | 'contacts' | 'activity'>(
    'overview'
  )

  const [aiChecklist, setAiChecklist] = useState<ChecklistItem[]>([])
  const [aiDeadlines, setAiDeadlines] = useState<DeadlineItem[]>([])
  const [aiContacts, setAiContacts] = useState<AiContact[]>([])

  const summary = useMemo(() => (tx?.ai_summary ?? null) as AiSummary, [tx])

  const [commHistoryLoading, setCommHistoryLoading] = useState(false)
  const [commsHistory, setCommsHistory] = useState<any[]>([])
  const [activityNote, setActivityNote] = useState('')

  // Reva panel state (permanent on right)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [revaMessages, setRevaMessages] = useState<RevaChatLine[]>([])
  const [revaInput, setRevaInput] = useState('')
  const [revaSending, setRevaSending] = useState(false)
  const revaInputRef = useRef<HTMLInputElement | null>(null)
  const revaScrollRef = useRef<HTMLDivElement | null>(null)

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
  const currentDocPhase = useMemo(() => normalizePhase(tx?.phase), [tx?.phase])
  const [expandedPhases, setExpandedPhases] = useState<Record<DocPhase, boolean>>({
    pre_contract: true,
    under_contract: false,
    closing: false,
  })

  const loadPageData = useCallback(async () => {
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
      setTxDocuments(
        Array.isArray(json?.transaction_documents)
          ? (json.transaction_documents as TransactionDocumentRow[])
          : []
      )
    } finally {
      setLoading(false)
    }
  }, [txId, router])

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
  }, [txId, loadPageData])

  useEffect(() => {
    if (!Number.isFinite(txId)) return
    const pending = txDocuments.some((d) =>
      ['uploading', 'uploaded', 'processing'].includes(String(d.status || ''))
    )
    if (!pending) return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/transactions/${txId}/documents`, { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        setTxDocuments(Array.isArray(j.documents) ? j.documents : [])
      } catch {
        // ignore
      }
    }, 2200)
    return () => clearInterval(t)
  }, [txDocuments, txId])

  useEffect(() => {
    if (addressMismatch) return
    for (const d of txDocuments) {
      if (String(d.status || '') !== 'reviewed') continue
      const am = d.deal_impact?.address_mismatch
      if (am?.mismatch === true && !addressMismatchDismissed.current.has(d.id)) {
        setAddressMismatch({
          docId: d.id,
          contract_address: am.contract_address,
          transaction_address: am.transaction_address,
        })
        if (animationComplete && !airdropVisible) {
          setShowAddressMismatchModal(true)
        }
        break
      }
    }
  }, [txDocuments, addressMismatch, animationComplete, airdropVisible])

  useEffect(() => {
    if (animationComplete && !airdropVisible && addressMismatch) {
      setShowAddressMismatchModal(true)
    }
  }, [animationComplete, airdropVisible, addressMismatch])

  useEffect(() => {
    if (!addressMismatch) setShowAddressMismatchModal(false)
  }, [addressMismatch])

  useEffect(() => {
    if (searchParams.get('created') === '1') {
      setToastMsg('Deal created! Reva is building your checklist...')
      window.setTimeout(() => setToastMsg(null), 4000)
      router.replace(`/transactions/${txId}`)
    }
  }, [searchParams, router, txId])

  useEffect(() => {
    setExpandedPhases({
      pre_contract: currentDocPhase === 'pre_contract',
      under_contract: currentDocPhase === 'under_contract',
      closing: currentDocPhase === 'closing',
    })
  }, [currentDocPhase])

  const uploadTxDoc = useCallback(
    async (
      file: File,
      options?: {
        documentType?: string
        displayName?: string
        isExecuted?: boolean
        rowSlotId?: string
      }
    ) => {
      if (!Number.isFinite(txId)) return
      if (txDocUploadBusy) return
      const effectiveType = options?.documentType || docTypePick
      const opt = DOCUMENT_TYPE_OPTIONS.find((o) => o.value === effectiveType)
      const displayName = options?.displayName
        || (effectiveType === 'other'
          ? customDocName.trim() || 'Custom document'
          : opt?.label || 'Document')
      const isExecuted = options?.isExecuted ?? isExecutedToggle
      setTxDocUploadBusy(true)
      if (options?.rowSlotId) setRowUploadingSlotId(options.rowSlotId)
      setAnimationComplete(false)
      setAirdropName(displayName)
      setAirdropVisible(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('document_type', effectiveType)
        fd.append('display_name', displayName)
        fd.append('is_executed', String(isExecuted))
        const res = await fetch(`/api/transactions/${txId}/documents`, { method: 'POST', body: fd })
        if (!res.ok) {
          let msg = 'Upload failed.'
          try {
            const j = await res.json()
            if (typeof j?.error === 'string') msg = j.error
          } catch {
            // ignore
          }
          throw new Error(msg)
        }
        const j = await res.json()
        if (j.document?.id) setAirdropWatchId(Number(j.document.id))
        setSelectedUploadFile(null)
        await loadPageData()
      } catch (e: unknown) {
        setAirdropVisible(false)
        setAnimationComplete(true)
        window.alert(e instanceof Error ? e.message : 'Upload failed.')
      } finally {
        setTxDocUploadBusy(false)
        setRowUploadingSlotId(null)
      }
    },
    [txId, txDocUploadBusy, docTypePick, customDocName, isExecutedToggle, loadPageData]
  )

  const onDropTx = useCallback(
    (accepted: File[]) => {
      const f = accepted[0]
      if (f) setSelectedUploadFile(f)
    },
    []
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropTx,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
    disabled: txDocUploadBusy,
  })

  // Prime AI state after tx load
  useEffect(() => {
    setAiChecklist(Array.isArray(tx?.ai_checklist) ? (tx.ai_checklist as ChecklistItem[]) : [])
    const rawDeadlines = tx?.ai_deadlines
    if (Array.isArray(rawDeadlines)) {
      setAiDeadlines(rawDeadlines as DeadlineItem[])
    } else if (rawDeadlines && typeof rawDeadlines === 'object' && Array.isArray((rawDeadlines as any).deadlines)) {
      setAiDeadlines((rawDeadlines as any).deadlines as DeadlineItem[])
    } else {
      setAiDeadlines([])
    }
    const rawContacts = tx?.ai_contacts
    if (Array.isArray(rawContacts)) {
      setAiContacts(rawContacts as AiContact[])
    } else if (rawContacts && typeof rawContacts === 'object' && Array.isArray((rawContacts as any).contacts)) {
      setAiContacts((rawContacts as any).contacts as AiContact[])
    } else {
      setAiContacts([])
    }
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

  async function applyContractAddressToDeal() {
    if (!addressMismatch || !Number.isFinite(txId)) return
    setAddressMismatchBusy(true)
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressMismatch.contract_address,
          activity_event: {
            icon: '✅',
            description: `Deal address updated to ${addressMismatch.contract_address}`,
          },
        }),
      })
      if (!res.ok) throw new Error('update failed')
      await fetch(`/api/transactions/${txId}/documents/${addressMismatch.docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_address_mismatch: true }),
      })
      addressMismatchDismissed.current.add(addressMismatch.docId)
      setAddressMismatch(null)
      setToastMsg('Deal address updated')
      window.setTimeout(() => setToastMsg(null), 3500)
      await loadPageData()
    } catch {
      window.alert('Could not update address.')
    } finally {
      setAddressMismatchBusy(false)
    }
  }

  function keepDealAddressDismissMismatch() {
    if (!addressMismatch || !Number.isFinite(txId)) return
    const docId = addressMismatch.docId
    addressMismatchDismissed.current.add(docId)
    setAddressMismatch(null)
    void fetch(`/api/transactions/${txId}/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear_address_mismatch: true }),
    }).then(() => loadPageData())
  }

  async function generateIntelligence() {
    if (!Number.isFinite(txId)) return
    await fetch(`/api/transactions/${txId}/analyze`, { method: 'POST' })
    await patchTransaction({
      activity_event: {
        icon: '📋',
        description: 'Checklist generated by Reva',
      },
    })
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
              <div className="mt-1 text-sm font-semibold text-white">{txDocuments.length}</div>
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
    const requiredSlots = TN_DOCUMENT_CHECKLIST.filter((s) => s.requirement === 'required')
    const uploadedByType = new Map<string, TransactionDocumentRow>()
    for (const d of txDocuments) {
      const existing = uploadedByType.get(d.document_type)
      if (!existing) {
        uploadedByType.set(d.document_type, d)
      } else if (
        new Date(d.created_at || 0).getTime() > new Date(existing.created_at || 0).getTime()
      ) {
        uploadedByType.set(d.document_type, d)
      }
    }
    const uploadedRequiredCount = requiredSlots.filter((s) => uploadedByType.has(s.document_type)).length
    const requiredTotal = requiredSlots.length
    const requiredPct = requiredTotal ? Math.round((uploadedRequiredCount / requiredTotal) * 100) : 0
    const missingRequiredCount = requiredTotal - uploadedRequiredCount

    const loanType = String(tx?.loan_type || '').toLowerCase()
    const fhaVaLoan = loanType.includes('fha') || loanType.includes('va')
    const conditionalNeeded = TN_DOCUMENT_CHECKLIST.filter((s) => {
      if (s.requirement !== 'conditional') return false
      const condition = String(s.condition || '').toLowerCase()
      if (condition.includes('fha') || condition.includes('va')) return fhaVaLoan && !uploadedByType.has(s.document_type)
      return false
    })
    const issueCount = txDocuments.reduce((acc, d) => acc + (d.broker_review?.issues?.length || 0), 0)

    const renderStatus = (slot: TNDocumentSlot, doc: TransactionDocumentRow | undefined) => {
      if (rowUploadingSlotId === slot.id) {
        return <span className="text-orange-200 animate-pulse">⏳ Processing</span>
      }
      if (!doc) return <span className="text-slate-400">⬜ Not uploaded</span>
      const status = String(doc.status || '').toLowerCase()
      if (status === 'reviewed') return <span className="text-emerald-300">✅ Reviewed</span>
      if (status === 'error') return <span className="text-red-300">❌ Error</span>
      if (status === 'processing' || status === 'uploading') return <span className="text-orange-200 animate-pulse">⏳ Processing</span>
      return <span className="text-blue-300">📤 Uploaded</span>
    }

    const renderRequirement = (slot: TNDocumentSlot) => {
      if (slot.requirement === 'required') {
        return <span className="rounded-full border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-200">🔴 Required</span>
      }
      if (slot.requirement === 'conditional') {
        return <span className="rounded-full border border-yellow-500/40 bg-yellow-500/20 px-2 py-0.5 text-[11px] font-semibold text-yellow-200">🟡 Conditional</span>
      }
      return <span className="rounded-full border border-slate-500/40 bg-slate-500/20 px-2 py-0.5 text-[11px] font-semibold text-slate-200">⚪ Optional</span>
    }

    const phaseSections: DocPhase[] = ['pre_contract', 'under_contract', 'closing']

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold text-white">📋 Reva&apos;s Document Check</h3>
          <div className="mt-3 space-y-1 text-sm text-slate-200">
            <div>{missingRequiredCount} required docs missing</div>
            <div>{conditionalNeeded.length} conditional doc needed{conditionalNeeded.length === 1 ? '' : 's'}{fhaVaLoan ? ' (FHA/VA loan)' : ''}</div>
            <div>{issueCount} issues found in uploaded docs</div>
          </div>
          <button
            type="button"
            onClick={() => setReviewDoc(txDocuments.find((d) => (d.broker_review?.issues?.length || 0) > 0) || null)}
            className="mt-3 rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
          >
            See Details
          </button>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div
            {...getRootProps()}
            className={classNames(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition',
              isDragActive ? 'border-orange-400 bg-orange-500/10' : 'border-slate-600 bg-[#0A1022]'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="text-orange-300" size={24} />
            <p className="mt-2 text-sm font-semibold text-white">Upload other documents not listed below</p>
            <p className="mt-1 text-xs text-slate-400">PDF files only · max 25MB</p>
            {selectedUploadFile ? <p className="mt-2 text-xs text-slate-300">Selected: {selectedUploadFile.name}</p> : null}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-slate-300">
              Document type
              <select
                value={docTypePick}
                onChange={(e) => setDocTypePick(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
              >
                {DOCUMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 mt-6 md:mt-0">
              <input
                type="checkbox"
                checked={isExecutedToggle}
                onChange={(e) => setIsExecutedToggle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              <span>Executed/Signed</span>
            </label>
          </div>

          {docTypePick === 'other' ? (
            <label className="mt-3 block text-xs font-medium text-slate-300">
              Custom name
              <input
                value={customDocName}
                onChange={(e) => setCustomDocName(e.target.value)}
                placeholder="e.g. HOA resale certificate"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => selectedUploadFile && void uploadTxDoc(selectedUploadFile)}
            disabled={txDocUploadBusy || !selectedUploadFile}
            className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-50"
          >
            {txDocUploadBusy ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
            <div>
              <span className="font-semibold text-white">{uploadedRequiredCount}</span> of{' '}
              <span className="font-semibold text-white">{requiredTotal}</span> required documents uploaded
            </div>
            <div className="text-xs text-slate-400">{requiredPct}%</div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${requiredPct}%` }} />
          </div>
        </div>

        {phaseSections.map((phase) => {
          const slots = getSlotsByPhase(phase)
          const uploadedInPhase = slots.filter((s) => uploadedByType.has(s.document_type)).length
          const isOpen = expandedPhases[phase]
          return (
            <div key={phase} className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }))}
              >
                <div className="text-sm font-semibold text-white">
                  {isOpen ? '▼' : '▶'} {phaseTitle(phase)} <span className="text-slate-400 font-normal">({uploadedInPhase} of {slots.length} uploaded)</span>
                </div>
              </button>

              {isOpen ? (
                <div className="mt-3 space-y-2">
                  {slots.map((slot) => {
                    const doc = uploadedByType.get(slot.document_type)
                    const docReady = !!doc
                    return (
                      <div
                        key={slot.id}
                        className="grid gap-2 rounded-lg border border-slate-700 bg-[#0A1022] p-3 md:grid-cols-[170px_140px_1fr_auto] md:items-center"
                      >
                        <div className="text-xs font-semibold">{renderStatus(slot, doc)}</div>
                        <div>{renderRequirement(slot)}</div>
                        <div className={classNames('text-sm text-white', slot.requirement === 'required' && 'font-semibold')} title={slot.requirement === 'conditional' ? `Required when: ${slot.condition || ''}` : undefined}>
                          {slot.display_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            ref={(el) => {
                              rowUploadInputRefs.current[slot.id] = el
                            }}
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              void uploadTxDoc(file, {
                                documentType: slot.document_type,
                                displayName: slot.display_name,
                                rowSlotId: slot.id,
                              })
                              e.currentTarget.value = ''
                            }}
                          />
                          {!docReady ? (
                            <button
                              type="button"
                              onClick={() => rowUploadInputRefs.current[slot.id]?.click()}
                              className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                            >
                              ⬆ Upload
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={!doc?.signed_url}
                                onClick={() => doc?.signed_url && window.open(doc.signed_url, '_blank', 'noopener,noreferrer')}
                                className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition disabled:opacity-40"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => setReviewDoc(doc)}
                                disabled={String(doc?.status || '') !== 'reviewed'}
                                className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition disabled:opacity-40"
                              >
                                Broker Review
                              </button>
                              <button
                                type="button"
                                onClick={() => rowUploadInputRefs.current[slot.id]?.click()}
                                className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-200 hover:bg-orange-500/20 transition"
                              >
                                Replace
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}

        {reviewDoc ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-slate-700 bg-[#0B1530] p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Broker review</h3>
                  <p className="text-xs text-slate-400">{reviewDoc.display_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewDoc(null)}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-orange-500/40"
                >
                  Close
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-200">
                {reviewDoc.broker_review?.natural_language_summary || 'No summary available.'}
              </p>
              {reviewDoc.deal_impact && Object.keys(reviewDoc.deal_impact).length > 0 ? (
                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  <div className="text-xs font-semibold uppercase text-slate-400">Deal impact</div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-200">
                    {JSON.stringify(reviewDoc.deal_impact, null, 2)}
                  </pre>
                </div>
              ) : null}
              <div className="mt-4 space-y-2">
                {(reviewDoc.broker_review?.issues || []).map((issue, idx) => (
                  <div
                    key={`${issue.message}-${idx}`}
                    className={classNames(
                      'rounded-lg border px-3 py-2 text-sm',
                      issue.severity === 'critical'
                        ? 'border-red-500/40 bg-red-950/40 text-red-100'
                        : issue.severity === 'warning'
                          ? 'border-orange-500/40 bg-orange-950/30 text-orange-100'
                          : 'border-slate-600 bg-slate-900/60 text-slate-200'
                    )}
                  >
                    <span className="text-xs font-bold uppercase text-slate-400">{issue.severity}</span>
                    <div className="mt-1">{issue.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
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
              const done = String(d.status || '').toLowerCase() === 'completed'
              const isOverdue = !done && delta !== null && delta < 0
              const within3 = !done && delta !== null && delta >= 0 && delta <= 3
              const within7 = !done && delta !== null && delta > 3 && delta <= 7
              const daysText = delta === null ? '—' : isOverdue ? `${Math.abs(delta)} days overdue` : delta === 0 ? 'Due today' : `${delta} days away`
              const urgencyClass = done
                ? 'border-slate-600 bg-slate-900/60 text-slate-200'
                : isOverdue || within3
                  ? 'border-red-500/40 bg-red-950/40 text-red-100'
                  : within7
                    ? 'border-orange-500/40 bg-orange-950/30 text-orange-100'
                    : 'border-green-500/40 bg-green-950/30 text-green-100'

              return (
                <div key={`${d.id || idx}-${d.title || 'deadline'}`} className={classNames('rounded-lg border p-4', urgencyClass)}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-semibold text-white">{d.title || 'Deadline item'}</div>
                      <div className="mt-1 text-xs text-slate-200">{formatDate(d.due_date || null)} · {daysText}</div>
                      {d.tca_reference ? <div className="mt-1 text-xs text-slate-300">TCA Reference: {d.tca_reference}</div> : null}
                    </div>
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
                        Text via GHL
                      </button>
                      <button
                        onClick={() => void sendRevaMessage(`Draft an email to ${name} (${role}) about this transaction. Include the key next step and dates.`)}
                        className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                      >
                        Email
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

  function activityTab() {
    const txActivity = Array.isArray(tx?.activity_log) ? tx.activity_log : []
    const docEvents = txDocuments.map((d) => ({
      icon: '📄',
      description: `${d.display_name} uploaded${String(d.status || '') === 'reviewed' ? ' and reviewed by Reva' : ''}`,
      timestamp: d.created_at || new Date().toISOString(),
    }))
    const commEvents = commsHistory.map((h) => ({
      icon: '💬',
      description: `Message sent via GHL (${String(h.channel || h.commType || 'message')})`,
      timestamp: String(h.created_at || new Date().toISOString()),
    }))
    const updatedEvent = tx?.updated_at
      ? [{ icon: '✅', description: 'Transaction updated', timestamp: String(tx.updated_at) }]
      : []
    const feed = [...txActivity, ...docEvents, ...commEvents, ...updatedEvent]
      .filter((x) => x?.description && x?.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Activity</h2>
            <button
              onClick={() => void loadCommsHistory()}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40 transition disabled:opacity-60"
              disabled={commHistoryLoading}
            >
              {commHistoryLoading ? <Loader2 size={16} className="animate-spin" /> : 'Refresh'}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={activityNote}
              onChange={(e) => setActivityNote(e.target.value)}
              placeholder="Add note to activity"
              className="w-full rounded-lg bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700"
            />
            <button
              type="button"
              onClick={async () => {
                const note = activityNote.trim()
                if (!note) return
                const current = Array.isArray(tx?.activity_log) ? tx.activity_log : []
                const next = [...current, { icon: '📝', description: note, timestamp: new Date().toISOString() }]
                await patchTransaction({ activity_log: next })
                setActivityNote('')
                await loadPageData()
              }}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600"
            >
              Add
            </button>
          </div>

          {!feed.length ? (
            <p className="mt-3 text-sm text-slate-400">{commHistoryLoading ? 'Loading…' : 'No activity yet.'}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {feed.map((h, idx) => (
                <div key={`${h.timestamp}-${idx}`} className="rounded-lg border border-slate-700 bg-[#0A1022] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-slate-100">
                      <span className="mr-2">{h.icon || '•'}</span>
                      {h.description}
                    </div>
                    <div className="text-xs text-slate-400">{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const airdropWatchDoc = useMemo(
    () => (airdropWatchId != null ? txDocuments.find((d) => d.id === airdropWatchId) : undefined),
    [airdropWatchId, txDocuments]
  )
  const airdropStatusForUi: 'processing' | 'reviewed' | 'error' =
    airdropWatchDoc?.status === 'reviewed'
      ? 'reviewed'
      : airdropWatchDoc?.status === 'error'
        ? 'error'
        : 'processing'

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
                { key: 'activity', label: 'Activity' },
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
            {activeTab === 'activity' ? activityTab() : null}
          </div>
        </section>

        {/* Reva panel (permanent right) */}
        <aside className="min-w-0">
          <div className="sticky top-4 rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src="/avatar-pilot.png"
                  alt="Reva"
                  width={36}
                  height={36}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #F97316',
                  }}
                />
                <h2 className="text-sm font-semibold text-white">Reva</h2>
              </div>
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

      <DocumentAirDrop
        isVisible={airdropVisible}
        documentName={airdropName}
        status={airdropStatusForUi}
        onComplete={() => {
          setAirdropVisible(false)
          setAnimationComplete(true)
          setAirdropWatchId(null)
        }}
      />

      {showAddressMismatchModal && addressMismatch ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-[#0B1530] p-6 shadow-xl">
            <div className="text-lg font-semibold text-white">📍 Address Mismatch</div>
            <p className="mt-4 text-sm text-slate-300">This contract is for:</p>
            <p className="mt-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white">
              {addressMismatch.contract_address}
            </p>
            <p className="mt-4 text-sm text-slate-300">This deal is labeled:</p>
            <p className="mt-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white">
              {addressMismatch.transaction_address}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  keepDealAddressDismissMismatch()
                  setShowAddressMismatchModal(false)
                }}
                className="rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40"
              >
                Keep current address
              </button>
              <button
                type="button"
                disabled={addressMismatchBusy}
                onClick={async () => {
                  await applyContractAddressToDeal()
                  setShowAddressMismatchModal(false)
                }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-60"
              >
                Update deal to contract address
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMsg ? (
        <div className="fixed bottom-6 left-1/2 z-[96] -translate-x-1/2 rounded-lg border border-orange-500/40 bg-[#0B1530] px-4 py-2 text-sm font-medium text-orange-100 shadow-lg">
          {toastMsg}
        </div>
      ) : null}
    </main>
  )
}

