'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { CircleHelp, Loader2, Mail, Phone, Trash2, Upload, User } from 'lucide-react'
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
  type?: string
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

type BundleDocument = {
  id: string
  display_name: string
  document_type: string
  signed_url: string
  file_name: string
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
  key_dates?: Record<string, unknown> | null
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

type TransactionContact = {
  id: string
  transaction_id: number
  user_id: string
  role: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  notes: string | null
  created_at: string
}

type ContactFormState = {
  name: string
  role: string
  phone: string
  email: string
  company: string
  notes: string
}

const CONTACT_ROLES = [
  'Buyer',
  'Seller',
  "Buyer's Agent",
  'Listing Agent',
  'Lender / Loan Officer',
  'Title Company / Closing Attorney',
  'Home Inspector',
  'TC (Transaction Coordinator)',
  'Other',
] as const

const EMPTY_CONTACT_FORM: ContactFormState = {
  name: '',
  role: CONTACT_ROLES[0],
  phone: '',
  email: '',
  company: '',
  notes: '',
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

function dateOnlyIso(input: string | null | undefined): string | null {
  if (!input) return null
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()
}

function addDaysIso(input: string | null | undefined, days: number): string | null {
  const base = dateOnlyIso(input)
  if (!base) return null
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function startOfTodayLocal(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

type DeadlineStatus = 'overdue' | 'due_soon' | 'on_track' | 'complete'

type DerivedDeadline = {
  id: string
  name: string
  dueDate: string | null
  completed: boolean
  notes?: string | null
}

function normalizeDeadlineName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function titleFromKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function parseDateLike(value: unknown): string | null {
  if (typeof value === 'string') return dateOnlyIso(value)
  if (value && typeof value === 'object') {
    const maybeDate = (value as Record<string, unknown>).date
    if (typeof maybeDate === 'string') return dateOnlyIso(maybeDate)
  }
  return null
}

function deriveDeadlineStatus(dueDate: string | null, completed: boolean): DeadlineStatus {
  if (completed) return 'complete'
  if (!dueDate) return 'on_track'
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return 'on_track'
  const diffDays = Math.ceil((due.getTime() - startOfTodayLocal().getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'due_soon'
  return 'on_track'
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
  const [bundleDownloading, setBundleDownloading] = useState(false)
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
  const [showAddDeadlineModal, setShowAddDeadlineModal] = useState(false)
  const [deadlineForm, setDeadlineForm] = useState({ name: '', dueDate: '', notes: '' })
  const [deadlineSaving, setDeadlineSaving] = useState(false)
  const [contacts, setContacts] = useState<TransactionContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactDeleteBusyId, setContactDeleteBusyId] = useState<string | null>(null)

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

  const loadContacts = useCallback(async () => {
    if (!Number.isFinite(txId)) return
    setContactsLoading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/contacts`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed contacts load (${res.status})`)
      const json = await res.json()
      setContacts(Array.isArray(json?.contacts) ? (json.contacts as TransactionContact[]) : [])
    } catch {
      setContacts([])
    } finally {
      setContactsLoading(false)
    }
  }, [txId])

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
    void loadPageData().then(() => Promise.all([loadCommsHistory(), loadContacts()]))
  }, [txId, loadPageData, loadContacts])

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
  }, [tx])

  const checklistItemsForTab = useMemo(
    () => aiChecklist.filter((item) => String(item.type || '').toLowerCase() !== 'deadline'),
    [aiChecklist]
  )

  const mergedDeadlines = useMemo(() => {
    const out: DerivedDeadline[] = []
    const seen = new Set<string>()

    for (const item of aiChecklist) {
      if (!item?.due_date) continue
      const name = item.title?.trim() || 'Checklist Deadline'
      const key = normalizeDeadlineName(name)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        id: `checklist_${String(item.id || key)}`,
        name,
        dueDate: dateOnlyIso(item.due_date) || item.due_date || null,
        completed: Boolean(item.completed),
        notes: item.notes || null,
      })
    }

    const rawKeyDates = tx?.key_dates
    if (rawKeyDates && typeof rawKeyDates === 'object') {
      for (const [rawKey, rawValue] of Object.entries(rawKeyDates)) {
        if (rawValue === null || rawValue === undefined) continue
        let name = titleFromKey(rawKey)
        let dueDate = parseDateLike(rawValue)
        if (rawValue && typeof rawValue === 'object') {
          const obj = rawValue as Record<string, unknown>
          if (typeof obj.name === 'string' && obj.name.trim()) name = obj.name.trim()
          if (!dueDate) dueDate = parseDateLike(obj.value)
        }
        const key = normalizeDeadlineName(name)
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
          id: `key_dates_${rawKey}`,
          name,
          dueDate,
          completed: false,
        })
      }
    }

    const generatedKnown = [
      { name: 'Inspection Period End', dueDate: addDaysIso(tx?.binding_date || null, 10) },
      { name: 'Financing Contingency', dueDate: addDaysIso(tx?.binding_date || null, 21) },
      { name: 'Appraisal Deadline', dueDate: addDaysIso(tx?.binding_date || null, 21) },
      { name: 'Title Search', dueDate: addDaysIso(tx?.binding_date || null, 14) },
      { name: 'Closing Date', dueDate: dateOnlyIso(tx?.closing_date || null) },
    ]

    for (const d of generatedKnown) {
      const key = normalizeDeadlineName(d.name)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        id: `generated_${key}`,
        name: d.name,
        dueDate: d.dueDate,
        completed: false,
      })
    }

    const statusRank: Record<DeadlineStatus, number> = {
      overdue: 0,
      due_soon: 1,
      on_track: 2,
      complete: 3,
    }

    return out.sort((a, b) => {
      const aStatus = deriveDeadlineStatus(a.dueDate, a.completed)
      const bStatus = deriveDeadlineStatus(b.dueDate, b.completed)
      if (statusRank[aStatus] !== statusRank[bStatus]) return statusRank[aStatus] - statusRank[bStatus]
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
  }, [aiChecklist, tx?.key_dates, tx?.binding_date, tx?.closing_date])

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

  async function saveCustomDeadline() {
    const name = deadlineForm.name.trim()
    if (!name) {
      window.alert('Deadline name is required.')
      return
    }
    const nextItem: ChecklistItem = {
      id: `deadline_${Date.now()}`,
      title: name,
      type: 'deadline',
      due_date: deadlineForm.dueDate ? new Date(`${deadlineForm.dueDate}T00:00:00`).toISOString() : null,
      completed: false,
      notes: deadlineForm.notes.trim() || null,
      category: 'deadline',
      priority: 'medium',
    }
    const next = [...aiChecklist, nextItem]
    setDeadlineSaving(true)
    setAiChecklist(next)
    try {
      await patchTransaction({ ai_checklist: next })
      setShowAddDeadlineModal(false)
      setDeadlineForm({ name: '', dueDate: '', notes: '' })
    } catch {
      await loadPageData()
      window.alert('Could not save deadline.')
    } finally {
      setDeadlineSaving(false)
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

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  function askRevaAboutChecklistItem(title?: string) {
    const prompt = `Tell me more about: ${title || 'this checklist item'}`
    setRevaInput(prompt)
    focusRevaInput()
  }

  async function downloadClosingPackage() {
    if (!Number.isFinite(txId) || bundleDownloading) return
    setBundleDownloading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/documents/bundle`, { cache: 'no-store' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(String(json?.error || 'Unable to prepare package'))
      }
      const json = await res.json()
      const docs = Array.isArray(json?.documents) ? (json.documents as BundleDocument[]) : []
      for (const doc of docs) {
        const a = document.createElement('a')
        a.href = doc.signed_url
        a.download = doc.file_name || `${doc.display_name || 'document'}.pdf`
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        a.remove()
        await sleep(300)
      }
      setToastMsg(`${docs.length} documents ready - downloading...`)
      window.setTimeout(() => setToastMsg(null), 3500)
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'Download failed.')
    } finally {
      setBundleDownloading(false)
    }
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
    const loanType = String(tx?.loan_type || '').toLowerCase()
    const fhaVaLoan = loanType.includes('fha') || loanType.includes('va') || loanType.includes('thda')
    const psaDoc = txDocuments.find((d) => d.document_type === 'rf401_psa')
    const extractedSource = (psaDoc?.extracted_data || {}) as Record<string, unknown>
    const extractedText = JSON.stringify(extractedSource).toLowerCase()
    const yearBuiltRaw = [
      extractedSource.year_built,
      extractedSource.yearBuilt,
      extractedSource.built_year,
      extractedSource.property_year_built,
    ].find((v) => v !== undefined && v !== null)
    const yearBuiltValue = Number(yearBuiltRaw)
    const pre1978Property = Number.isFinite(yearBuiltValue) ? yearBuiltValue < 1978 : extractedText.includes('pre-1978')
    const hasSepticProperty =
      extractedText.includes('septic') ||
      String(extractedSource.waste_disposal || '').toLowerCase().includes('septic') ||
      String(extractedSource.wastewater || '').toLowerCase().includes('septic') ||
      Boolean(extractedSource.has_septic)

    const triggeredBadgeBySlotId = new Map<string, string>()
    if (fhaVaLoan) triggeredBadgeBySlotId.set('fha_va_addendum', 'NEEDED FOR YOUR LOAN TYPE')
    if (pre1978Property) triggeredBadgeBySlotId.set('lead_paint', 'REQUIRED - PRE-1978 PROPERTY')
    if (hasSepticProperty) {
      triggeredBadgeBySlotId.set('septic_importance', 'NEEDED FOR THIS PROPERTY')
      triggeredBadgeBySlotId.set('subsurface_sewage', 'NEEDED FOR THIS PROPERTY')
      triggeredBadgeBySlotId.set('water_waste', 'NEEDED FOR THIS PROPERTY')
    }

    const downloadableDocumentsCount = txDocuments.filter((d) =>
      Boolean(d.file_url) && ['uploaded', 'reviewed'].includes(String(d.status || '').toLowerCase())
    ).length
    const canDownloadPackage = downloadableDocumentsCount >= 1

    const renderStatus = (slot: TNDocumentSlot, doc: TransactionDocumentRow | undefined) => {
      if (rowUploadingSlotId === slot.id) {
        return <span className="text-orange-200">⏳ Uploading...</span>
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
            <div>
              <span className="font-semibold text-white">{uploadedRequiredCount}</span> of{' '}
              <span className="font-semibold text-white">{requiredTotal}</span> required documents uploaded
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400">{requiredPct}%</div>
              <button
                type="button"
                onClick={() => void downloadClosingPackage()}
                disabled={!canDownloadPackage || bundleDownloading}
                title={!canDownloadPackage ? 'Upload documents to enable' : undefined}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bundleDownloading ? <Loader2 size={14} className="animate-spin" /> : null}
                {bundleDownloading ? 'Preparing package...' : '📦 Download Closing Package'}
              </button>
            </div>
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
              <p className="mt-2 text-xs text-slate-400">Click ⬆ Upload on any row to attach that document</p>

              {isOpen ? (
                <div className="mt-3 space-y-2">
                  {slots.map((slot) => {
                    const doc = uploadedByType.get(slot.document_type)
                    const docReady = !!doc
                    const triggeredBadge = triggeredBadgeBySlotId.get(slot.id)
                    return (
                      <div
                        key={slot.id}
                        className={classNames(
                          'grid gap-2 rounded-lg border bg-[#0A1022] p-3 md:grid-cols-[170px_140px_1fr_auto] md:items-center',
                          triggeredBadge ? 'border-orange-500/60 bg-orange-950/15' : 'border-slate-700'
                        )}
                      >
                        <div className="text-xs font-semibold">{renderStatus(slot, doc)}</div>
                        <div>{renderRequirement(slot)}</div>
                        <div className={classNames('text-sm text-white', slot.requirement === 'required' && 'font-semibold')} title={slot.requirement === 'conditional' ? `Required when: ${slot.condition || ''}` : undefined}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{slot.display_name}</span>
                            <details className="group relative">
                              <summary className="list-none cursor-pointer text-slate-300 hover:text-orange-200">
                                <CircleHelp size={14} />
                              </summary>
                              <div className="absolute z-10 mt-2 w-72 rounded-md border border-slate-600 bg-[#0B1530] p-2 text-xs text-slate-200 shadow-xl">
                                {slot.why_it_matters || 'This document protects your client and your license.'}
                              </div>
                            </details>
                            {triggeredBadge ? (
                              <span className="rounded-full border border-orange-500/60 bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-100">
                                {triggeredBadge}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
                              ⬆ Upload PDF
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
                          {rowUploadingSlotId === slot.id ? (
                            <div className="w-full">
                              <div className="mb-1 text-[11px] font-medium text-orange-200">Uploading...</div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                                <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-500" />
                              </div>
                            </div>
                          ) : null}
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
    const total = checklistItemsForTab.length
    const done = checklistItemsForTab.filter((i) => Boolean(i.completed)).length
    const pct = total ? Math.round((done / total) * 100) : 0
    const byPriority = {
      critical: checklistItemsForTab.filter((i) => String(i.priority || '').toLowerCase() === 'critical'),
      high: checklistItemsForTab.filter((i) => String(i.priority || '').toLowerCase() === 'high'),
      mediumLow: checklistItemsForTab.filter((i) => {
        const p = String(i.priority || 'medium').toLowerCase()
        return p !== 'critical' && p !== 'high'
      }),
    }

    const requiredSlots = TN_DOCUMENT_CHECKLIST.filter((s) => s.requirement === 'required')
    const optionalSlots = TN_DOCUMENT_CHECKLIST.filter((s) => s.requirement === 'optional')
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

    const loanType = String(tx?.loan_type || '').toLowerCase()
    const fhaVaLoan = loanType.includes('fha') || loanType.includes('va') || loanType.includes('thda')
    const psaDoc = txDocuments.find((d) => d.document_type === 'rf401_psa')
    const extractedSource = (psaDoc?.extracted_data || {}) as Record<string, unknown>
    const extractedText = JSON.stringify(extractedSource).toLowerCase()
    const yearBuiltRaw = [
      extractedSource.year_built,
      extractedSource.yearBuilt,
      extractedSource.built_year,
      extractedSource.property_year_built,
    ].find((v) => v !== undefined && v !== null)
    const yearBuiltValue = Number(yearBuiltRaw)
    const pre1978Property = Number.isFinite(yearBuiltValue) ? yearBuiltValue < 1978 : extractedText.includes('pre-1978')
    const hasSepticProperty =
      extractedText.includes('septic') ||
      String(extractedSource.waste_disposal || '').toLowerCase().includes('septic') ||
      String(extractedSource.wastewater || '').toLowerCase().includes('septic') ||
      Boolean(extractedSource.has_septic)

    const triggeredBadgeBySlotId = new Map<string, string>()
    const triggeredTypeBySlotId = new Map<string, 'FHA/VA' | 'pre-1978' | 'septic'>()
    if (fhaVaLoan) triggeredBadgeBySlotId.set('fha_va_addendum', 'NEEDED FOR YOUR LOAN TYPE')
    if (fhaVaLoan) triggeredTypeBySlotId.set('fha_va_addendum', 'FHA/VA')
    if (pre1978Property) triggeredBadgeBySlotId.set('lead_paint', 'REQUIRED - PRE-1978 PROPERTY')
    if (pre1978Property) triggeredTypeBySlotId.set('lead_paint', 'pre-1978')
    if (hasSepticProperty) {
      triggeredBadgeBySlotId.set('septic_importance', 'NEEDED FOR THIS PROPERTY')
      triggeredBadgeBySlotId.set('subsurface_sewage', 'NEEDED FOR THIS PROPERTY')
      triggeredBadgeBySlotId.set('water_waste', 'NEEDED FOR THIS PROPERTY')
      triggeredTypeBySlotId.set('septic_importance', 'septic')
      triggeredTypeBySlotId.set('subsurface_sewage', 'septic')
      triggeredTypeBySlotId.set('water_waste', 'septic')
    }

    const missingRequiredSlots = requiredSlots.filter((s) => !uploadedByType.has(s.document_type))
    const triggeredConditionalSlots = TN_DOCUMENT_CHECKLIST.filter(
      (s) => s.requirement === 'conditional' && triggeredBadgeBySlotId.has(s.id) && !uploadedByType.has(s.document_type)
    )
    const missingOptionalSlots = optionalSlots.filter((s) => !uploadedByType.has(s.document_type))
    const issueCount = txDocuments.reduce((acc, d) => acc + (d.broker_review?.issues?.length || 0), 0)
    const totalMissing = missingRequiredSlots.length + triggeredConditionalSlots.length

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-[#111B36] p-4">
          <h3 className="text-sm font-semibold text-white">📋 Reva&apos;s Deal Health View</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              <div className="text-xs uppercase tracking-wide text-red-200">Required Missing</div>
              <div className="mt-1 text-lg font-semibold">{missingRequiredSlots.length}</div>
            </div>
            <div className="rounded-lg border border-orange-500/30 bg-orange-950/30 px-3 py-2 text-sm text-orange-100">
              <div className="text-xs uppercase tracking-wide text-orange-200">Conditional Missing</div>
              <div className="mt-1 text-lg font-semibold">{triggeredConditionalSlots.length}</div>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
              <div className="text-xs uppercase tracking-wide text-slate-300">Issues in Reviewed Docs</div>
              <div className="mt-1 text-lg font-semibold">{issueCount}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-300">
            {missingRequiredSlots.slice(0, 2).map((slot) => (
              <div key={`required-${slot.id}`}>- Missing required: {slot.display_name}</div>
            ))}
            {triggeredConditionalSlots.slice(0, 2).map((slot) => (
              <div key={`triggered-${slot.id}`}>
                - Missing conditional ({triggeredTypeBySlotId.get(slot.id) || 'deal type'}): {slot.display_name}
              </div>
            ))}
            {missingOptionalSlots.length > 0 ? <div>- {missingOptionalSlots.length} optional docs recommended</div> : null}
          </div>
        </div>

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

        <div className="space-y-3">
          {[
            { key: 'critical', label: '🔴 CRITICAL', open: true, items: byPriority.critical },
            { key: 'high', label: '🟡 HIGH', open: true, items: byPriority.high },
            { key: 'mediumLow', label: '🟢 MEDIUM / LOW', open: false, items: byPriority.mediumLow },
          ].map((group) => (
            <details
              key={group.key}
              open={group.open}
              className="rounded-xl border border-slate-700 bg-slate-900/30 p-4"
            >
              <summary className="cursor-pointer text-sm font-semibold text-white">
                {group.label} <span className="text-slate-400 font-normal">({group.items.length})</span>
              </summary>
              <div className="mt-3 space-y-2">
                {!group.items.length ? (
                  <p className="text-sm text-slate-500">No items in this priority band.</p>
                ) : (
                  group.items.map((item) => {
                    const idx = aiChecklist.findIndex((x) => x === item)
                    const p = priorityPill(item.priority || 'medium')
                    return (
                      <div
                        key={`${item.id || item.title || idx}-${String(item.category || 'General')}`}
                        className="rounded-lg border border-slate-700 bg-[#0A1022] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={Boolean(item.completed)}
                              onChange={() => void toggleChecklistItem(idx)}
                            />
                            <div>
                              <div className="text-sm font-semibold text-white">{item.title || 'Checklist item'}</div>
                              <div className="mt-1 text-xs text-slate-300">
                                {item.notes || 'No additional notes.'}
                              </div>
                            </div>
                          </div>
                          <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold border', p.className)}>
                            {item.priority || p.label}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-300">Due: {formatDate(item.due_date || null)}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleChecklistItem(idx)}
                            className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                          >
                            {item.completed ? 'Mark Incomplete' : 'Mark Complete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => askRevaAboutChecklistItem(item.title)}
                            className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-100 hover:bg-orange-500/20 transition"
                          >
                            Ask Reva
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </details>
          ))}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-200">
              <span className="font-semibold text-white">{totalMissing}</span> required documents missing
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
            >
              View in Documents tab →
            </button>
          </div>
        </div>
      </div>
    )
  }

  function deadlinesTab() {
    function statusMeta(d: DerivedDeadline): {
      label: string
      icon: string
      rowClass: string
      badgeClass: string
      daysClass: string
    } {
      const status = deriveDeadlineStatus(d.dueDate, d.completed)
      if (status === 'complete') {
        return {
          label: 'Complete',
          icon: '✅',
          rowClass: 'border-emerald-500/40 bg-emerald-950/20',
          badgeClass: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100',
          daysClass: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100',
        }
      }
      if (status === 'overdue') {
        return {
          label: 'Overdue',
          icon: '🔴',
          rowClass: 'border-red-500/40 bg-red-950/25',
          badgeClass: 'border-red-500/40 bg-red-500/20 text-red-100',
          daysClass: 'border-red-500/40 bg-red-500/20 text-red-100',
        }
      }
      if (status === 'due_soon') {
        return {
          label: 'Due Soon',
          icon: '🟡',
          rowClass: 'border-yellow-500/40 bg-yellow-950/20',
          badgeClass: 'border-yellow-500/40 bg-yellow-500/20 text-yellow-100',
          daysClass: 'border-yellow-500/40 bg-yellow-500/20 text-yellow-100',
        }
      }
      return {
        label: 'On Track',
        icon: '🟢',
        rowClass: 'border-green-500/40 bg-green-950/20',
        badgeClass: 'border-green-500/40 bg-green-500/20 text-green-100',
        daysClass: 'border-green-500/40 bg-green-500/20 text-green-100',
      }
    }

    function daysRemainingText(d: DerivedDeadline): string {
      if (d.completed) return 'Complete'
      if (!d.dueDate) return 'Date TBD'
      const due = new Date(d.dueDate)
      if (Number.isNaN(due.getTime())) return 'Date TBD'
      const diffDays = Math.ceil((due.getTime() - startOfTodayLocal().getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) return `Overdue ${Math.abs(diffDays)} days`
      if (diffDays === 0) return 'Today'
      return `${diffDays} days`
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Deadlines</h2>
            <button
              type="button"
              onClick={() => setShowAddDeadlineModal(true)}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition"
            >
              + Add Deadline
            </button>
          </div>

          {!mergedDeadlines.length ? <p className="mt-3 text-sm text-slate-400">No deadlines yet.</p> : null}

          <div className="mt-3 space-y-2">
            {mergedDeadlines.map((d) => {
              const meta = statusMeta(d)
              return (
                <div key={d.id} className={classNames('rounded-lg border p-4', meta.rowClass)}>
                  <div className="grid gap-2 md:grid-cols-[220px_130px_1fr_150px] md:items-center">
                    <div>
                      <span className={classNames('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', meta.badgeClass)}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">{d.dueDate ? formatDate(d.dueDate) : 'Date TBD'}</div>
                    <div className="text-sm text-slate-100">
                      {d.name}
                      {d.notes ? <div className="mt-1 text-xs text-slate-300">{d.notes}</div> : null}
                    </div>
                    <div className="md:text-right">
                      <span className={classNames('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', meta.daysClass)}>
                        {daysRemainingText(d)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {showAddDeadlineModal ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0B1530] p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Add Deadline</h3>
                <button
                  type="button"
                  onClick={() => setShowAddDeadlineModal(false)}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-orange-500/40"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="text-xs font-medium text-slate-300">
                  Deadline name (required)
                  <input
                    value={deadlineForm.name}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="e.g. HOA Review Deadline"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Date
                  <input
                    type="date"
                    value={deadlineForm.dueDate}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Notes
                  <textarea
                    value={deadlineForm.notes}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="Optional notes..."
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeadlineModal(false)}
                  className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveCustomDeadline()}
                  disabled={deadlineSaving}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-60"
                >
                  {deadlineSaving ? 'Saving…' : 'Save Deadline'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  function contactsTab() {
    function openAddContactModal() {
      setEditingContactId(null)
      setContactForm(EMPTY_CONTACT_FORM)
      setShowContactModal(true)
    }

    function openEditContactModal(contact: TransactionContact) {
      setEditingContactId(contact.id)
      setContactForm({
        name: contact.name || '',
        role: contact.role || CONTACT_ROLES[0],
        phone: contact.phone || '',
        email: contact.email || '',
        company: contact.company || '',
        notes: contact.notes || '',
      })
      setShowContactModal(true)
    }

    async function saveContact() {
      const name = contactForm.name.trim()
      const role = contactForm.role.trim()
      if (!name) {
        window.alert('Name is required.')
        return
      }
      if (!role) {
        window.alert('Role is required.')
        return
      }
      if (!Number.isFinite(txId)) return

      setContactSaving(true)
      try {
        const payload = {
          name,
          role,
          phone: contactForm.phone.trim() || null,
          email: contactForm.email.trim() || null,
          company: contactForm.company.trim() || null,
          notes: contactForm.notes.trim() || null,
        }
        const method = editingContactId ? 'PATCH' : 'POST'
        const url = editingContactId
          ? `/api/transactions/${txId}/contacts/${editingContactId}`
          : `/api/transactions/${txId}/contacts`
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(String(json?.error || 'Could not save contact'))
        }
        setShowContactModal(false)
        setEditingContactId(null)
        setContactForm(EMPTY_CONTACT_FORM)
        await loadContacts()
      } catch (e: unknown) {
        window.alert(e instanceof Error ? e.message : 'Could not save contact')
      } finally {
        setContactSaving(false)
      }
    }

    async function deleteContact(contactId: string) {
      if (!Number.isFinite(txId)) return
      const ok = window.confirm('Delete this contact?')
      if (!ok) return
      setContactDeleteBusyId(contactId)
      try {
        const res = await fetch(`/api/transactions/${txId}/contacts/${contactId}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(String(json?.error || 'Could not delete contact'))
        }
        await loadContacts()
      } catch (e: unknown) {
        window.alert(e instanceof Error ? e.message : 'Could not delete contact')
      } finally {
        setContactDeleteBusyId(null)
      }
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Transaction Contacts</h2>
            <button
              type="button"
              onClick={openAddContactModal}
              className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-black hover:bg-orange-600 transition"
            >
              + Add Contact
            </button>
          </div>

          {contactsLoading ? (
            <p className="mt-3 text-sm text-slate-400">Loading contacts…</p>
          ) : !contacts.length ? (
            <p className="mt-3 text-sm text-slate-400">No contacts listed yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {contacts.map((contact) => {
                return (
                  <div key={contact.id} className="rounded-xl border border-slate-700 bg-[#0A1022] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300">
                          <User size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{contact.name}</div>
                          <div className="mt-1 text-xs text-slate-300">
                            {contact.role}
                            {contact.company ? ` · ${contact.company}` : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditContactModal(contact)}
                        className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-300">
                      {contact.phone ? (
                        <div className="inline-flex items-center gap-2">
                          <Phone size={13} className="text-slate-400" />
                          <a href={`tel:${contact.phone}`} className="text-slate-100 hover:text-orange-200">
                            {contact.phone}
                          </a>
                        </div>
                      ) : null}
                      {contact.email ? (
                        <div className="inline-flex items-center gap-2">
                          <Mail size={13} className="text-slate-400" />
                          <a href={`mailto:${contact.email}`} className="text-slate-100 hover:text-orange-200">
                            {contact.email}
                          </a>
                        </div>
                      ) : null}
                      {contact.notes ? <div className="pt-1 text-slate-400">{contact.notes}</div> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void deleteContact(contact.id)}
                        disabled={contactDeleteBusyId === contact.id}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        {contactDeleteBusyId === contact.id ? 'Deleting…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => void sendRevaMessage(`Draft a text message to ${contact.name} (${contact.role}) with the next step and relevant dates for this transaction.`)}
                        className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                      >
                        Text via GHL
                      </button>
                      <button
                        onClick={() => void sendRevaMessage(`Draft an email to ${contact.name} (${contact.role}) about this transaction. Include the key next step and dates.`)}
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

        {showContactModal ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0B1530] p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">
                  {editingContactId ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowContactModal(false)
                    setEditingContactId(null)
                  }}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-orange-500/40"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="text-xs font-medium text-slate-300">
                  Name (required)
                  <input
                    value={contactForm.name}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="John Smith"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Role (required)
                  <select
                    value={contactForm.role}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  >
                    {CONTACT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Phone
                  <input
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="423-555-0100"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Email
                  <input
                    value={contactForm.email}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="john@example.com"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Company/Brokerage
                  <input
                    value={contactForm.company}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, company: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="Acme Mortgage"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Notes
                  <textarea
                    value={contactForm.notes}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="Optional notes..."
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactModal(false)
                    setEditingContactId(null)
                  }}
                  className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveContact()}
                  disabled={contactSaving}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-60"
                >
                  {contactSaving ? 'Saving…' : 'Save Contact'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
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

