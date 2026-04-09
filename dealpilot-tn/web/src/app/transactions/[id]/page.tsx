'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Bell,
  Bot,
  CheckCircle2,
  CircleHelp,
  FileText,
  Loader2,
  Mail,
  Phone,
  PhoneCall,
  Plus,
  Trash2,
  Upload,
  User,
  AlertTriangle,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { createBrowserClient } from '@/lib/supabase-browser'
import DocumentAirDrop from '@/components/ui/DocumentAirDrop'
import ContractWizard from '@/components/wizard/ContractWizard'
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
  phase?: 'pre_contract' | 'under_contract' | 'closing' | null
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

type TxRow = {
  id: number | string
  address?: string | null
  client?: string | null
  seller_name?: string | null
  type?: string | null
  status?: string | null
  phase?: string | null
  binding_date?: string | null
  closing_date?: string | null
  purchase_price?: number | null
  earnest_money?: number | null
  earnest_money_confirmed?: boolean | null
  earnest_money_confirmed_at?: string | null
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

type ActivityType = 'document' | 'checklist' | 'reva' | 'communication' | 'system' | 'warning' | 'call'

type ActivityItem = {
  id: string
  activity_type: ActivityType
  title: string
  description: string | null
  created_at: string
  source: 'manual' | 'documents' | 'checklist' | 'communication' | 'transaction'
}

type ManualActivityFormType = 'call' | 'email' | 'note' | 'meeting'

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
  // Parse YYYY-MM-DD as local time — new Date("YYYY-MM-DD") is UTC midnight which
  // shifts to the previous day in US timezones.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString()
  }
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

function labelForDeadlineStatus(status: DeadlineStatus): string {
  if (status === 'overdue') return 'OVERDUE'
  if (status === 'due_soon') return 'DUE SOON'
  if (status === 'complete') return 'COMPLETE'
  return 'ON TRACK'
}

function dueBadgeText(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null
  const days = daysUntil(dueDate)
  if (days === null) return null
  if (days < 0) return `OVERDUE ${Math.abs(days)}D`
  if (days === 0) return 'DUE TODAY'
  if (days <= 3) return `DUE IN ${days}D`
  return null
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function inferChecklistPhase(item: ChecklistItem, fallback: DocPhase): DocPhase {
  if (item.phase === 'pre_contract' || item.phase === 'under_contract' || item.phase === 'closing') {
    return item.phase
  }
  // Legacy fallback: category-based mapping
  const category = String(item.category || '').toLowerCase()
  if (category === 'closing') return 'closing'
  if (category === 'pre_contract') return 'pre_contract'
  if (['contract', 'financing', 'inspection', 'title'].includes(category)) return 'under_contract'
  return fallback
}

function TransactionDetailContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const txId = params?.id ?? ''

  const [loading, setLoading] = useState(true)
  const [tx, setTx] = useState<TxRow | null | undefined>(undefined)
  const [txDocuments, setTxDocuments] = useState<TransactionDocumentRow[]>([])
  const [previewDoc, setPreviewDoc] = useState<TransactionDocumentRow | null>(null)
  const [packagePreviewUrl, setPackagePreviewUrl] = useState<string | null>(null)
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

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'documents'
    | 'contract'
    | 'checklist'
    | 'inspectors'
    | 'deadlines'
    | 'contacts'
    | 'activity'
    | 'outbox'
  >('overview')

  const supabase = useMemo(() => createBrowserClient(), [])
  const [outboxItems, setOutboxItems] = useState<any[]>([])
  const [outboxLoading, setOutboxLoading] = useState(false)

  const [aiChecklist, setAiChecklist] = useState<ChecklistItem[]>([])
  const [showEditDealModal, setShowEditDealModal] = useState(false)
  const [editDealForm, setEditDealForm] = useState({
    address: '',
    client: '',
    binding_date: '',
    closing_date: '',
    purchase_price: '',
    status: '',
    phase: '',
  })
  const [showAddDeadlineModal, setShowAddDeadlineModal] = useState(false)
  const [deadlineForm, setDeadlineForm] = useState({ name: '', dueDate: '', notes: '' })
  const [deadlineSaving, setDeadlineSaving] = useState(false)
  const [earnestConfirmBusy, setEarnestConfirmBusy] = useState(false)
  const [contacts, setContacts] = useState<TransactionContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactDeleteBusyId, setContactDeleteBusyId] = useState<string | null>(null)

  const [txInspectors, setTxInspectors] = useState<any[]>([])
  const [txInspectorsLoading, setTxInspectorsLoading] = useState(false)
  const [showAssignInspectorModal, setShowAssignInspectorModal] = useState(false)
  const [inspectorDirectory, setInspectorDirectory] = useState<any[]>([])
  const [assignInspectorForm, setAssignInspectorForm] = useState({
    inspector_id: '',
    inspection_type: 'home',
    scheduled_at: '',
    notes: '',
  })
  const [assignInspectorSaving, setAssignInspectorSaving] = useState(false)
  const [inspectorPatchBusy, setInspectorPatchBusy] = useState<string | null>(null)

  const summary = useMemo(() => (tx?.ai_summary ?? null) as AiSummary, [tx])

  const [commHistoryLoading, setCommHistoryLoading] = useState(false)
  const [commsHistory, setCommsHistory] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activitySaving, setActivitySaving] = useState(false)
  const [activityForm, setActivityForm] = useState<{
    type: ManualActivityFormType
    note: string
    dateTime: string
  }>({
    type: 'note',
    note: '',
    dateTime: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  })

  const [showSendMessageModal, setShowSendMessageModal] = useState(false)
  const [sendChannel, setSendChannel] = useState<'sms' | 'email'>('sms')
  const [sendContactId, setSendContactId] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [sendMessageBusy, setSendMessageBusy] = useState(false)
  const [revaDraftBusy, setRevaDraftBusy] = useState(false)
  const [sendDraftedByReva, setSendDraftedByReva] = useState(false)

  // Vera panel state (permanent on right)
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
  const sellerName = tx?.seller_name || '—'
  const bindingLabel = formatDate(tx?.binding_date)
  const closingLabel = formatDate(tx?.closing_date)
  const currentDocPhase = useMemo(() => normalizePhase(tx?.phase), [tx?.phase])
  const [expandedPhases, setExpandedPhases] = useState<Record<DocPhase, boolean>>({
    pre_contract: true,
    under_contract: true,
    closing: false,
  })

  const loadPageData = useCallback(async () => {
    if (!txId) return
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
    if (!txId) return
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
    if (!txId) return
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

  async function loadActivity() {
    if (!txId) return
    setActivityLoading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/activity`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed activity load (${res.status})`)
      const json = await res.json()
      setActivityFeed(Array.isArray(json?.events) ? (json.events as ActivityItem[]) : [])
    } catch {
      setActivityFeed([])
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData().then(() => Promise.all([loadCommsHistory(), loadContacts(), loadActivity()]))
  }, [txId, loadPageData, loadContacts])

  useEffect(() => {
    if (activeTab !== 'inspectors' || !txId) return
    let cancelled = false
    setTxInspectorsLoading(true)
    fetch(`/api/transactions/${txId}/inspectors`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setTxInspectors(Array.isArray(j.inspectors) ? j.inspectors : [])
      })
      .catch(() => {
        if (!cancelled) setTxInspectors([])
      })
      .finally(() => {
        if (!cancelled) setTxInspectorsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, txId])

  useEffect(() => {
    if (activeTab !== 'outbox' || !txId) return
    let cancelled = false
    setOutboxLoading(true)
    supabase
      .from('communication_log')
      .select('*')
      .eq('transaction_ref', parseInt(String(txId), 10))
      .eq('status', 'queued')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setOutboxItems(data ?? [])
      })
      .finally(() => {
        if (!cancelled) setOutboxLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, txId, supabase])

  useEffect(() => {
    if (!txId) return
    const pending = txDocuments.some((d) =>
      ['uploading', 'processing'].includes(String(d.status || ''))
    )
    if (!pending) return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/transactions/${txId}/documents`, { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        const docs = Array.isArray(j.documents) ? j.documents : []
        setTxDocuments(docs)
        const stillPending = docs.some((d: TransactionDocumentRow) =>
          ['uploading', 'processing'].includes(String(d.status || ''))
        )
        if (!stillPending) clearInterval(t)
      } catch {
        // ignore
      }
    }, 2200)
    return () => clearInterval(t)
  }, [txId])

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
      setToastMsg('Deal created! Vera is building your checklist...')
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
      if (!txId) return
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
        if (j.document?.id) {
          const watchId = Number(j.document.id)
          // Poll every 3 seconds until doc status is reviewed or error
          const pollInterval = setInterval(async () => {
            const pollRes = await fetch(`/api/transactions/${txId}`, { cache: 'no-store' })
            if (!pollRes.ok) { clearInterval(pollInterval); return }
            const pollJson = await pollRes.json()
            const docs = Array.isArray(pollJson?.transaction_documents) 
              ? pollJson.transaction_documents 
              : []
            setTxDocuments(docs)
            const doc = docs.find((d: TransactionDocumentRow) => d.id === watchId)
            if (doc?.status === 'reviewed' || doc?.status === 'error') {
              clearInterval(pollInterval)
            }
          }, 3000)
          // Safety timeout — stop polling after 2 minutes
          setTimeout(() => clearInterval(pollInterval), 120000)
        }
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
      { name: 'Inspection Period End', dueDate: (tx as any)?.inspection_end_date ? dateOnlyIso((tx as any).inspection_end_date) : addDaysIso(tx?.binding_date || null, (tx as any)?.inspection_period_days ?? 10) },
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
    // keep Vera scrolled to bottom as messages change
    try {
      if (revaScrollRef.current) revaScrollRef.current.scrollTop = revaScrollRef.current.scrollHeight
    } catch {
      // ignore
    }
  }, [revaMessages, revaSending])

  async function patchTransaction(payload: Record<string, any>) {
    if (!txId) return
    await fetch(`/api/transactions/${txId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async function applyContractAddressToDeal() {
    if (!addressMismatch || !txId) return
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
    if (!addressMismatch || !txId) return
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
    if (!txId) return
    await fetch(`/api/transactions/${txId}/analyze`, { method: 'POST' })
    await patchTransaction({
      activity_event: {
        icon: '📋',
        description: 'Checklist generated by Vera',
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
    if (!txId) return
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
    if (!txId || bundleDownloading) return
    setBundleDownloading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/documents/bundle`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        let msg = 'Unable to prepare package'
        try {
          const j = await res.json()
          msg = String(j?.error || msg)
        } catch {
          // non-JSON error body, keep default message
        }
        throw new Error(msg)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPackagePreviewUrl(url)
      setPreviewDoc({
        display_name: 'Closing Package',
        signed_url: url,
        id: -1,
      } as TransactionDocumentRow)
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : 'Download failed.')
    } finally {
      setBundleDownloading(false)
    }
  }

  async function sendRevaMessage(message: string) {
    const trimmed = message.trim()
    if (!trimmed) return
    if (!txId) return
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
        content: replyRaw || 'Vera replied.',
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
          content: 'Vera is temporarily unavailable. Please try again.',
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Vera Summary</h2>
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
              {tx?.earnest_money != null && tx?.earnest_money_confirmed === true ? (
                <div className="mt-2 text-sm font-medium text-green-400">Earnest Money Confirmed ✓</div>
              ) : null}
              {tx?.earnest_money != null && tx?.earnest_money_confirmed !== true ? (
                <button
                  type="button"
                  disabled={earnestConfirmBusy}
                  onClick={() => {
                    void (async () => {
                      setEarnestConfirmBusy(true)
                      try {
                        const res = await fetch(`/api/transactions/${txId}/confirm-earnest`, { method: 'POST' })
                        if (!res.ok) {
                          const j = await res.json().catch(() => ({}))
                          setToastMsg(String(j?.error || 'Could not confirm earnest money'))
                          return
                        }
                        await loadPageData()
                      } finally {
                        setEarnestConfirmBusy(false)
                      }
                    })()
                  }}
                  className="mt-2 w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition disabled:opacity-60"
                >
                  {earnestConfirmBusy ? '…' : '✅ Confirm Earnest Received'}
                </button>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Loan type</div>
              <div className="mt-1 text-sm font-semibold text-white">{tx?.loan_type || '—'}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Inspection period</div>
              <div className="mt-1 text-sm font-semibold text-white">{tx?.inspection_period_days ? `${tx.inspection_period_days} days` : '—'}</div>
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
      <div className="flex gap-4 items-start">
      <div className={previewDoc ? 'w-1/2 space-y-4' : 'w-full space-y-4'}>
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
                                onClick={() => setPreviewDoc(doc ?? null)}
                                className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition disabled:opacity-40"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => setReviewDoc(doc)}
                                disabled={false}
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

      {previewDoc && (
        <div className="sticky top-4 h-[calc(100vh-120px)] w-1/2 flex flex-col rounded-xl border border-slate-700 bg-[#0B1530] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-sm font-semibold text-white truncate">{previewDoc.display_name}</span>
            <div className="flex items-center gap-2">
              {previewDoc.id === -1 && packagePreviewUrl && (
                <a
                  href={packagePreviewUrl}
                  download="closing-package.pdf"
                  className="rounded px-2 py-1 text-xs font-semibold text-slate-200 border border-slate-600 hover:border-orange-500/40 transition"
                >
                  ⬇ Download
                </a>
              )}
              <button
                onClick={() => {
                  if (packagePreviewUrl) URL.revokeObjectURL(packagePreviewUrl)
                  setPackagePreviewUrl(null)
                  setPreviewDoc(null)
                }}
                className="text-slate-400 hover:text-white"
              >✕</button>
            </div>
          </div>
          <iframe
            src={previewDoc.signed_url ?? ''}
            className="flex-1 w-full"
            title={previewDoc.display_name ?? 'Document'}
          />
        </div>
      )}
      </div>
    )
  }

  function checklistTab() {
    const requiredSlots = TN_DOCUMENT_CHECKLIST.filter((s) => s.requirement === 'required')
    const uploadedByType = new Map<string, TransactionDocumentRow>()
    for (const d of txDocuments) {
      const existing = uploadedByType.get(d.document_type)
      if (!existing) {
        uploadedByType.set(d.document_type, d)
      } else if (new Date(d.created_at || 0).getTime() > new Date(existing.created_at || 0).getTime()) {
        uploadedByType.set(d.document_type, d)
      }
    }

    const currentPhaseSlots = getSlotsByPhase(currentDocPhase)
    const otherPhases: DocPhase[] = ['pre_contract', 'under_contract', 'closing'].filter((p) => p !== currentDocPhase) as DocPhase[]
    const prioritizedRequiredSlots = [
      ...currentPhaseSlots.filter((s) => s.requirement === 'required'),
      ...otherPhases.flatMap((phase) => getSlotsByPhase(phase).filter((s) => s.requirement === 'required')),
    ]
    const firstMissingRequiredSlot = prioritizedRequiredSlots.find((slot) => !uploadedByType.has(slot.document_type))

    const firstUrgentDeadline = mergedDeadlines.find((deadline) => {
      const status = deriveDeadlineStatus(deadline.dueDate, deadline.completed)
      return status === 'overdue' || status === 'due_soon'
    })

    const firstCriticalItem = checklistItemsForTab.find(
      (item) => !item.completed && String(item.priority || '').toLowerCase() === 'critical'
    )

    const nextAction = (() => {
      if (firstUrgentDeadline) {
        const status = deriveDeadlineStatus(firstUrgentDeadline.dueDate, firstUrgentDeadline.completed)
        return {
          title: `Deadline: ${firstUrgentDeadline.name}`,
          detail:
            status === 'overdue'
              ? `This deadline is overdue. Handle it now to protect the contract timeline.`
              : `This deadline is due soon. Resolve it now to stay ahead of the timeline.`,
          ctaLabel: 'Open Deadlines',
          onCta: () => setActiveTab('deadlines'),
          askPrompt: `Help me handle this deadline now: ${firstUrgentDeadline.name}.`,
        }
      }
      if (firstMissingRequiredSlot) {
        return {
          title: `Missing document: ${firstMissingRequiredSlot.display_name}`,
          detail: `Upload this now so your file is compliant for the ${phaseTitle(firstMissingRequiredSlot.phase)} phase.`,
          ctaLabel: `Upload ${firstMissingRequiredSlot.display_name}`,
          onCta: () => setActiveTab('documents'),
          askPrompt: `I am missing ${firstMissingRequiredSlot.display_name}. What should I do right now?`,
        }
      }
      if (firstCriticalItem) {
        return {
          title: firstCriticalItem.title || 'Critical checklist item',
          detail: firstCriticalItem.notes || 'This is a critical item that should be completed now.',
          ctaLabel: 'Mark Done',
          onCta: () => {
            const idx = aiChecklist.findIndex((x) => x === firstCriticalItem)
            if (idx >= 0) void toggleChecklistItem(idx)
          },
          askPrompt: `Walk me through this critical checklist item: ${firstCriticalItem.title || 'critical item'}.`,
        }
      }
      return {
        title: 'You are on track',
        detail: 'No urgent deadlines, missing required docs, or critical checklist blockers were found.',
        ctaLabel: 'Review Documents',
        onCta: () => setActiveTab('documents'),
        askPrompt: 'What should I proactively do next on this deal?',
      }
    })()

    const checklistByPhase: Record<DocPhase, ChecklistItem[]> = {
      pre_contract: [],
      under_contract: [],
      closing: [],
    }
    for (const item of checklistItemsForTab) {
      const phase = inferChecklistPhase(item, currentDocPhase)
      checklistByPhase[phase].push(item)
    }

    for (const phase of (['pre_contract', 'under_contract', 'closing'] as DocPhase[])) {
      checklistByPhase[phase].sort((a, b) =>
        (PRIORITY_ORDER[a.priority || 'low'] ?? 3) - (PRIORITY_ORDER[b.priority || 'low'] ?? 3)
      )
    }

    const orderedPhases: DocPhase[] = ['pre_contract', 'under_contract', 'closing']

    const requiredDocPct = requiredSlots.length
      ? Math.round((requiredSlots.filter((slot) => uploadedByType.has(slot.document_type)).length / requiredSlots.length) * 100)
      : 100
    const criticalItems = checklistItemsForTab.filter((item) => String(item.priority || '').toLowerCase() === 'critical')
    const criticalPct = criticalItems.length
      ? Math.round((criticalItems.filter((item) => Boolean(item.completed)).length / criticalItems.length) * 100)
      : 100
    const hasOverdueDeadline = mergedDeadlines.some((d) => deriveDeadlineStatus(d.dueDate, d.completed) === 'overdue')
    const healthScore = Math.min(100, Math.round(requiredDocPct * 0.5 + criticalPct * 0.4 + (hasOverdueDeadline ? 0 : 10)))
    const healthClass =
      healthScore < 50
        ? 'border-red-500/40 bg-red-950/30 text-red-100'
        : healthScore <= 80
          ? 'border-yellow-500/40 bg-yellow-950/30 text-yellow-100'
          : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-orange-500/40 bg-[#111B36] p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-200">Vera&apos;s Next Action</div>
          <h3 className="mt-2 text-lg font-semibold text-white">🤖 {nextAction.title}</h3>
          <p className="mt-3 max-w-3xl text-sm text-slate-200">{nextAction.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={nextAction.onCta}
              className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-black hover:bg-orange-600 transition"
            >
              {nextAction.ctaLabel}
            </button>
            <button
              type="button"
              onClick={() => void sendRevaMessage(nextAction.askPrompt)}
              className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-100 hover:bg-orange-500/20 transition"
            >
              Ask Vera about this
            </button>
          </div>
        </div>

        {orderedPhases.map((phase) => (
          <details
            key={phase}
            open={phase === currentDocPhase}
            className="rounded-xl border border-slate-700 bg-slate-900/30 p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold text-white">
              {phaseTitle(phase)}
              <span className="ml-2 text-slate-400 font-normal">({checklistByPhase[phase].length})</span>
              {phase === currentDocPhase ? <span className="ml-2 text-xs text-orange-200">(current)</span> : null}
            </summary>
            <div className="mt-3 space-y-2">
              {!checklistByPhase[phase].length ? (
                <p className="text-sm text-slate-500">No checklist items in this phase.</p>
              ) : (
                checklistByPhase[phase].map((item) => {
                  const idx = aiChecklist.findIndex((x) => x === item)
                  const dueTag = dueBadgeText(item.due_date || null)
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
                              {item.notes || 'Vera guidance pending: ask Vera for the exact next move on this item.'}
                            </div>
                          </div>
                        </div>
                        {dueTag ? (
                          <span className="rounded-full border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-100">
                            🔴 {dueTag}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleChecklistItem(idx)}
                          className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500/40 transition"
                        >
                          {item.completed ? 'Mark Undone' : 'Mark Done'}
                        </button>
                        <button
                          type="button"
                          onClick={() => askRevaAboutChecklistItem(item.title)}
                          className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-100 hover:bg-orange-500/20 transition"
                        >
                          Ask Vera
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </details>
        ))}

        <div className={classNames('rounded-xl border p-4', healthClass)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">Deal Health: {healthScore}%</div>
            <div className="text-xs opacity-90">
              Docs {requiredDocPct}% · Critical {criticalPct}% · {hasOverdueDeadline ? 'Overdue deadlines present' : 'No overdue deadlines (+bonus)'}
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-black/30">
            <div className="h-2 rounded-full bg-current" style={{ width: `${healthScore}%` }} />
          </div>
          {firstUrgentDeadline ? (
            <p className="mt-3 text-xs opacity-90">
              Most urgent deadline: {firstUrgentDeadline.name} ({labelForDeadlineStatus(deriveDeadlineStatus(firstUrgentDeadline.dueDate, firstUrgentDeadline.completed))})
            </p>
          ) : null}
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

  function inspectorsTab() {
    const inspectionTypeOptions = [
      { value: 'home', label: 'Home' },
      { value: 'wdi', label: 'WDI' },
      { value: 'septic', label: 'Septic' },
      { value: 'well', label: 'Well' },
      { value: 'mold', label: 'Mold' },
      { value: 'radon', label: 'Radon' },
    ] as const

    const providerCategoryOrder = [
      'inspector',
      'contractor',
      'lender',
      'title_company',
      'attorney',
      'other',
    ] as const

    const providerCategoryLabels: Record<string, string> = {
      inspector: 'Inspector',
      contractor: 'Contractor',
      lender: 'Lender',
      title_company: 'Title Company',
      attorney: 'Attorney',
      other: 'Other',
    }

    function normalizeProviderCategory(c: unknown): string {
      const v = typeof c === 'string' ? c.toLowerCase() : 'inspector'
      if ((providerCategoryOrder as readonly string[]).includes(v)) return v
      return 'other'
    }

    function groupDirectoryForSelect(list: unknown[]) {
      const groups = new Map<string, Record<string, unknown>[]>()
      for (const d of list) {
        const row = d && typeof d === 'object' ? (d as Record<string, unknown>) : null
        if (!row) continue
        const cat = normalizeProviderCategory(row.category)
        if (!groups.has(cat)) groups.set(cat, [])
        groups.get(cat)!.push(row)
      }
      return providerCategoryOrder.filter((k) => groups.has(k)).map((k) => ({
        key: k,
        label: providerCategoryLabels[k] || k,
        items: groups.get(k)!,
      }))
    }

    function providerCategoryDisplay(c: unknown): string {
      const k = normalizeProviderCategory(c)
      return providerCategoryLabels[k] || k
    }

    function inspectionLabel(v: string | null | undefined): string {
      const key = String(v || 'home').toLowerCase()
      const found = inspectionTypeOptions.find((o) => o.value === key)
      return found?.label || key
    }

    function pickInspector(inspectors: unknown): Record<string, unknown> | null {
      if (!inspectors) return null
      const row = Array.isArray(inspectors) ? inspectors[0] : inspectors
      return row && typeof row === 'object' ? (row as Record<string, unknown>) : null
    }

    function formatDateTimeLocal(iso: string | null | undefined): string {
      if (!iso) return '—'
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString()
    }

    async function openAssignModal() {
      setAssignInspectorForm({
        inspector_id: '',
        inspection_type: 'home',
        scheduled_at: '',
        notes: '',
      })
      try {
        const res = await fetch('/api/inspectors', { cache: 'no-store' })
        const j = await res.json()
        setInspectorDirectory(Array.isArray(j.inspectors) ? j.inspectors : [])
      } catch {
        setInspectorDirectory([])
      }
      setShowAssignInspectorModal(true)
    }

    async function submitAssign() {
      if (!txId) return
      const iid = assignInspectorForm.inspector_id.trim()
      if (!iid) {
        window.alert('Select a service provider.')
        return
      }
      setAssignInspectorSaving(true)
      try {
        const payload: Record<string, unknown> = {
          inspector_id: iid,
          inspection_type: assignInspectorForm.inspection_type,
          notes: assignInspectorForm.notes.trim() || null,
        }
        if (assignInspectorForm.scheduled_at) {
          const d = new Date(assignInspectorForm.scheduled_at)
          if (!Number.isNaN(d.getTime())) payload.scheduled_at = d.toISOString()
        }
        const res = await fetch(`/api/transactions/${txId}/inspectors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          window.alert(j?.error || 'Could not assign')
          return
        }
        setShowAssignInspectorModal(false)
        const r2 = await fetch(`/api/transactions/${txId}/inspectors`, { cache: 'no-store' })
        const j2 = await r2.json()
        setTxInspectors(Array.isArray(j2.inspectors) ? j2.inspectors : [])
      } finally {
        setAssignInspectorSaving(false)
      }
    }

    async function patchAssignment(id: string, body: Record<string, unknown>) {
      if (!txId) return
      setInspectorPatchBusy(id)
      try {
        const res = await fetch(`/api/transactions/${txId}/inspectors`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...body }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          window.alert(j?.error || 'Update failed')
          return
        }
        const r2 = await fetch(`/api/transactions/${txId}/inspectors`, { cache: 'no-store' })
        const j2 = await r2.json()
        setTxInspectors(Array.isArray(j2.inspectors) ? j2.inspectors : [])
      } finally {
        setInspectorPatchBusy(null)
      }
    }

    async function deleteAssignment(id: string, name: string) {
      console.log('[deleteAssignment] called with id:', id, 'name:', name)
      if (!txId) return
      if (!window.confirm(`Remove ${name} from this transaction?`)) return
      setInspectorPatchBusy(id)
      try {
        const res = await fetch(`/api/transactions/${txId}/inspectors`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          window.alert(j?.error || 'Could not remove')
          return
        }
        const r2 = await fetch(`/api/transactions/${txId}/inspectors`, { cache: 'no-store' })
        const j2 = await r2.json()
        setTxInspectors(Array.isArray(j2.inspectors) ? j2.inspectors : [])
      } finally {
        setInspectorPatchBusy(null)
      }
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Services</h2>
            <button
              type="button"
              onClick={() => void openAssignModal()}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition"
            >
              + Assign provider
            </button>
          </div>

          {txInspectorsLoading ? (
            <p className="mt-3 text-sm text-slate-400">Loading…</p>
          ) : txInspectors.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              No service providers assigned. Click + Assign provider to add one.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {txInspectors.map((row: any) => {
                const insp = pickInspector(row.inspectors)
                const name = String(insp?.name || 'Service provider')
                const company = insp?.company ? String(insp.company) : ''
                const phone = insp?.phone ? String(insp.phone) : ''
                const providerCat = providerCategoryDisplay(insp?.category)
                const bm = String(insp?.booking_method || 'call').toLowerCase()
                const st = String(row.status || 'pending').toLowerCase()
                const busy = inspectorPatchBusy === row.id
                console.log('[inspectorCard] row.id:', row.id, 'row keys:', Object.keys(row))

                let statusBadge = 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                let statusLabel = 'Pending'
                if (st === 'scheduled') {
                  statusBadge = 'border-sky-500/40 bg-sky-500/15 text-sky-100'
                  statusLabel = 'Scheduled'
                } else if (st === 'completed') {
                  statusBadge = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                  statusLabel = 'Completed'
                }

                return (
                  <div key={row.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-semibold text-white">{name}</div>
                        {company ? <div className="text-sm text-slate-400">{company}</div> : null}
                        {phone ? <div className="mt-1 text-sm text-slate-300">{phone}</div> : null}
                        <div className="mt-2 text-xs text-slate-500">
                          Category:{' '}
                          <span className="font-medium text-slate-300">{providerCat}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Service type:{' '}
                          <span className="font-medium text-slate-300">{inspectionLabel(row.inspection_type)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge}`}>
                          {statusLabel}
                        </span>
                        {bm === 'call' ? (
                          <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-200">
                            Requires Phone Call
                          </span>
                        ) : null}
                        {bm === 'text' ? (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                            Can Text to Book
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {row.scheduled_at ? (
                      <div className="mt-2 text-xs text-slate-400">
                        Scheduled: <span className="text-slate-200">{formatDateTimeLocal(row.scheduled_at)}</span>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {st === 'pending' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void patchAssignment(row.id, {
                              status: 'scheduled',
                              scheduled_at: row.scheduled_at || new Date().toISOString(),
                            })
                          }
                          className="rounded-lg border border-sky-600/50 bg-sky-950/40 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:border-sky-500/60 disabled:opacity-50"
                        >
                          Mark Scheduled
                        </button>
                      ) : null}
                      {st === 'scheduled' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void patchAssignment(row.id, {
                              status: 'completed',
                              completed_at: new Date().toISOString(),
                            })
                          }
                          className="rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:border-emerald-500/60 disabled:opacity-50"
                        >
                          Mark Complete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteAssignment(row.id, name)}
                        className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:border-red-500/60 disabled:opacity-50"
                      >
                        Remove
                      </button>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={Boolean(row.report_received)}
                          disabled={busy}
                          onChange={(e) => void patchAssignment(row.id, { report_received: e.target.checked })}
                          className="rounded border-slate-600"
                        />
                        Report Received
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {showAssignInspectorModal ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0B1530] p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Assign service provider</h3>
                <button
                  type="button"
                  onClick={() => setShowAssignInspectorModal(false)}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-orange-500/40"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                <label className="text-xs font-medium text-slate-300">
                  Service provider
                  <select
                    value={assignInspectorForm.inspector_id}
                    onChange={(e) => setAssignInspectorForm((f) => ({ ...f, inspector_id: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select…</option>
                    {groupDirectoryForSelect(inspectorDirectory).map((g) => (
                      <optgroup key={g.key} label={g.label}>
                        {g.items.map((d) => (
                          <option key={String(d.id)} value={String(d.id)}>
                            {String(d.name || '')}
                            {d.company ? ` — ${String(d.company)}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Service type
                  <select
                    value={assignInspectorForm.inspection_type}
                    onChange={(e) => setAssignInspectorForm((f) => ({ ...f, inspection_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  >
                    {inspectionTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Scheduled date/time (optional)
                  <input
                    type="datetime-local"
                    value={assignInspectorForm.scheduled_at}
                    onChange={(e) => setAssignInspectorForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Notes
                  <textarea
                    value={assignInspectorForm.notes}
                    onChange={(e) => setAssignInspectorForm((f) => ({ ...f, notes: e.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="Optional…"
                  />
                </label>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignInspectorModal(false)}
                  className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitAssign()}
                  disabled={assignInspectorSaving}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-60"
                >
                  {assignInspectorSaving ? 'Saving…' : 'Assign'}
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
      if (!txId) return

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
      if (!txId) return
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
                        type="button"
                        onClick={() => {
                          setActiveTab('activity')
                          setSendChannel('email')
                          setSendContactId(contact.id)
                          setSendSubject('')
                          setSendBody('')
                          setSendDraftedByReva(false)
                          setShowSendMessageModal(true)
                        }}
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

  function formatTimelineTimestamp(value: string): string {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (dStart.getTime() === today.getTime()) return `Today, ${time}`
    if (dStart.getTime() === yesterday.getTime()) return `Yesterday, ${time}`
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  function activityMeta(type: ActivityType): { icon: React.ReactNode; dotClass: string } {
    if (type === 'document') {
      return { icon: <FileText size={14} className="text-blue-200" />, dotClass: 'border-blue-400 bg-blue-500/20' }
    }
    if (type === 'checklist') {
      return { icon: <CheckCircle2 size={14} className="text-emerald-200" />, dotClass: 'border-emerald-400 bg-emerald-500/20' }
    }
    if (type === 'reva') {
      return { icon: <Bot size={14} className="text-purple-200" />, dotClass: 'border-purple-400 bg-purple-500/20' }
    }
    if (type === 'communication') {
      return { icon: <Mail size={14} className="text-teal-200" />, dotClass: 'border-teal-400 bg-teal-500/20' }
    }
    if (type === 'warning') {
      return { icon: <AlertTriangle size={14} className="text-orange-200" />, dotClass: 'border-orange-400 bg-orange-500/20' }
    }
    if (type === 'call') {
      return { icon: <PhoneCall size={14} className="text-blue-200" />, dotClass: 'border-blue-400 bg-blue-500/20' }
    }
    return { icon: <Bell size={14} className="text-slate-200" />, dotClass: 'border-slate-400 bg-slate-500/20' }
  }

  function activityTab() {
    async function letRevaDraftMessage() {
      if (!txId) return
      const contact = contacts.find((c) => c.id === sendContactId)
      if (!sendContactId || !contact) {
        window.alert('Select a contact first.')
        return
      }
      setRevaDraftBusy(true)
      setSendDraftedByReva(false)
      try {
        const channelLabel = sendChannel === 'sms' ? 'SMS text message' : 'email'
        const prompt = [
          `You are Vera, a Tennessee transaction coordinator. Draft only the body of a ${channelLabel} to ${contact.name} (${contact.role}) for this deal.`,
          sendChannel === 'email'
            ? `If a subject line is needed, put it on the first line as "Subject: ..." then a blank line, then the body.`
            : `Keep the SMS under 300 characters when possible. No greeting boilerplate unless appropriate.`,
          `Property: ${propertyAddress}. Client: ${clientName}. Deal phase: ${tx?.phase || 'intake'}.`,
          `Write the message only — no preamble or explanation.`,
        ].join('\n')
        const res = await fetch('/api/reva/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            dealId: txId,
            context: 'compose_message',
          }),
        })
        const json = await res.json().catch(() => ({}))
        const reply = String(json?.reply || '').trim()
        if (!reply) {
          window.alert('Vera did not return a draft. Try again.')
          return
        }
        if (sendChannel === 'email') {
          const m = reply.match(/^Subject:\s*(.+)$/im)
          if (m) {
            const subjectLine = m[1].trim()
            const rest = reply.replace(/^Subject:\s*.+$/im, '').trim()
            setSendSubject(subjectLine)
            setSendBody(rest)
          } else {
            setSendBody(reply)
          }
        } else {
          setSendBody(reply)
        }
        setSendDraftedByReva(true)
      } catch {
        window.alert('Could not get a draft from Vera.')
      } finally {
        setRevaDraftBusy(false)
      }
    }

    async function sendGhlMessage() {
      if (!txId) return
      const contact = contacts.find((c) => c.id === sendContactId)
      if (!sendContactId || !contact) {
        window.alert('Select a contact.')
        return
      }
      const body = sendBody.trim()
      if (!body) {
        window.alert('Enter a message.')
        return
      }
      if (sendChannel === 'email') {
        const sub = sendSubject.trim()
        if (!sub) {
          window.alert('Subject is required for email.')
          return
        }
        if (!contact.email?.trim()) {
          window.alert('This contact has no email. Add one on the Contacts tab or choose another contact.')
          return
        }
      } else if (!contact.phone?.trim()) {
        window.alert('This contact has no phone number. Add one on the Contacts tab or choose another contact.')
        return
      }
      setSendMessageBusy(true)
      try {
        const res = await fetch('/api/communications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: sendChannel,
            dealId: txId,
            transactionContactId: sendContactId,
            subject: sendChannel === 'email' ? sendSubject.trim() : '',
            message: body,
            triggeredByReva: sendDraftedByReva,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(String(json?.error || 'Send failed'))
        }
        const fromNum = json?.ghlFromNumber ? String(json.ghlFromNumber) : ''
        const fromEmail = json?.sentFromEmail ? String(json.sentFromEmail) : ''
        if (sendChannel === 'sms' && fromNum) {
          setToastMsg(`Message sent from GHL number ${fromNum}`)
        } else if (sendChannel === 'email' && fromEmail) {
          setToastMsg(`Email sent from ${fromEmail}`)
        } else {
          setToastMsg('Message sent.')
        }
        window.setTimeout(() => setToastMsg(null), 5000)
        setShowSendMessageModal(false)
        setSendSubject('')
        setSendBody('')
        setSendDraftedByReva(false)
        await loadActivity()
      } catch (e: unknown) {
        window.alert(e instanceof Error ? e.message : 'Send failed.')
      } finally {
        setSendMessageBusy(false)
      }
    }

    async function submitManualActivity() {
      const note = activityForm.note.trim()
      if (!note) {
        window.alert('Note text is required.')
        return
      }
      if (!txId) return

      const label =
        activityForm.type === 'call'
          ? 'Call logged'
          : activityForm.type === 'email'
            ? 'Email logged'
            : activityForm.type === 'meeting'
              ? 'Meeting logged'
              : 'Note added'

      setActivitySaving(true)
      try {
        const res = await fetch(`/api/transactions/${txId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: activityForm.type,
            title: label,
            note,
            date_time: new Date(activityForm.dateTime).toISOString(),
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(String(j?.error || 'Could not save activity'))
        }
        setShowActivityModal(false)
        setActivityForm({
          type: 'note',
          note: '',
          dateTime: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        })
        await loadActivity()
      } catch (e: unknown) {
        window.alert(e instanceof Error ? e.message : 'Could not save activity')
      } finally {
        setActivitySaving(false)
      }
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Transaction Timeline</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void loadActivity()}
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40 transition disabled:opacity-60"
                disabled={activityLoading}
              >
                {activityLoading ? <Loader2 size={16} className="animate-spin" /> : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSendChannel('sms')
                  setSendContactId((prev) => prev || (contacts[0]?.id ?? ''))
                  setSendSubject('')
                  setSendBody('')
                  setSendDraftedByReva(false)
                  setShowSendMessageModal(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-600/60 bg-teal-950/40 px-3 py-2 text-sm font-semibold text-teal-100 hover:border-teal-400/60 transition"
              >
                <Mail size={16} />
                Send Message
              </button>
              <button
                type="button"
                onClick={() => setShowActivityModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition"
              >
                <Plus size={16} />
                Log Activity
              </button>
            </div>
          </div>

          {!activityFeed.length ? (
            <p className="mt-3 text-sm text-slate-400">{activityLoading ? 'Loading…' : 'No activity yet.'}</p>
          ) : (
            <div className="mt-4 space-y-4">
              {activityFeed.map((item) => {
                const meta = activityMeta(item.activity_type)
                return (
                  <div key={item.id} className="relative pl-10">
                    <div className="absolute left-[17px] top-8 h-[calc(100%+16px)] w-px bg-slate-700" />
                    <div className={classNames('absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border', meta.dotClass)}>
                      {meta.icon}
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-[#0A1022] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {formatTimelineTimestamp(item.created_at)}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">{item.title}</div>
                      {item.description ? <div className="mt-1 text-sm text-slate-300">{item.description}</div> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {showSendMessageModal ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0B1530] p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Send message (GHL)</h3>
                <button
                  type="button"
                  onClick={() => setShowSendMessageModal(false)}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-orange-500/40"
                >
                  Close
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Uses your GHL API key from Settings. Recipients must match contacts on this transaction.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="text-xs font-medium text-slate-300">
                  To
                  <select
                    value={sendContactId}
                    onChange={(e) => setSendContactId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select contact…</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Channel
                  <select
                    value={sendChannel}
                    onChange={(e) => setSendChannel(e.target.value as 'sms' | 'email')}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </label>
                {sendChannel === 'email' ? (
                  <label className="text-xs font-medium text-slate-300">
                    Subject
                    <input
                      value={sendSubject}
                      onChange={(e) => setSendSubject(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                      placeholder="Subject line"
                    />
                  </label>
                ) : null}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-slate-300">Message</label>
                  <textarea
                    value={sendBody}
                    onChange={(e) => setSendBody(e.target.value)}
                    className="min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder={sendChannel === 'sms' ? 'SMS body…' : 'Email body…'}
                  />
                  <button
                    type="button"
                    onClick={() => void letRevaDraftMessage()}
                    disabled={revaDraftBusy || !sendContactId}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-2 text-xs font-semibold text-purple-100 hover:border-purple-400/60 disabled:opacity-50"
                  >
                    {revaDraftBusy ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                    Let Vera Draft It
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSendMessageModal(false)}
                  className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void sendGhlMessage()}
                  disabled={sendMessageBusy || contactsLoading || !contacts.length}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-60"
                >
                  {sendMessageBusy ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showActivityModal ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0B1530] p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Log Activity</h3>
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-orange-500/40"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="text-xs font-medium text-slate-300">
                  Type
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, type: e.target.value as ManualActivityFormType }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="note">Note</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Note
                  <textarea
                    value={activityForm.note}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, note: e.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                    placeholder="What happened?"
                  />
                </label>
                <label className="text-xs font-medium text-slate-300">
                  Date/Time
                  <input
                    type="datetime-local"
                    value={activityForm.dateTime}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, dateTime: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitManualActivity()}
                  disabled={activitySaving}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-60"
                >
                  {activitySaving ? 'Saving…' : 'Save Activity'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  function outboxTab() {
    type CommunicationLogRow = {
      id: string
      channel: 'email' | 'sms'
      body: string | null
      contact_name: string | null
      contact_email: string | null
      contact_phone: string | null
      contact_role: string | null
      subject: string | null
      created_at: string
    }

    async function approve(item: CommunicationLogRow) {
      const body = item.body?.replace(/^\[[\w_]+\]\s*/, '') ?? ''
      const res = await fetch('/api/communications/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.channel,
          dealId: txId,
          contactName: item.contact_name,
          contactEmail: item.contact_email,
          contactPhone: item.contact_phone,
          contactRole: item.contact_role,
          subject: item.subject || '',
          message: body,
        }),
      })
      if (res.ok) {
        const { error: updateErr } = await supabase.from('communication_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id)
        if (updateErr) console.error('[outbox] status update failed:', updateErr.message)
        setOutboxItems((prev) => prev.filter((i) => i.id !== item.id))
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        window.alert(j?.error || 'Failed to send')
      }
    }

    async function reject(item: CommunicationLogRow) {
      if (!window.confirm('Discard this message?')) return
      await supabase.from('communication_log').update({ status: 'rejected' }).eq('id', item.id)
      setOutboxItems((prev) => prev.filter((i) => i.id !== item.id))
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
          <h2 className="text-sm font-semibold text-white">Pending Vera Messages</h2>
          <p className="mt-1 text-xs text-slate-400">These messages were drafted by Vera and are waiting for your approval before sending.</p>
          {outboxLoading ? (
            <p className="mt-3 text-sm text-slate-400">Loading…</p>
          ) : outboxItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No pending messages. Vera has nothing queued for this transaction.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {outboxItems.map((item: CommunicationLogRow) => (
                <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.channel === 'email' ? 'bg-sky-500/20 text-sky-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                        {item.channel?.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">To: {item.contact_email || item.contact_phone || item.contact_name || item.contact_role}</span>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  {item.subject && <div className="mt-2 text-sm font-medium text-white">{item.subject}</div>}
                  <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{item.body?.replace(/^\[[\w_]+\]\s*/, '')}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void approve(item)}
                      className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-orange-600"
                    >
                      Approve & Send
                    </button>
                    <button
                      type="button"
                      onClick={() => void reject(item)}
                      className="rounded-lg border border-red-600/50 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:border-red-500/60"
                    >
                      Discard
                    </button>
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

  if (loading || tx === undefined) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[70%_30%]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
              <div className="h-5 w-72 bg-slate-700 rounded animate-pulse" />
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-20 bg-slate-700 rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-slate-700 rounded-full animate-pulse" />
              </div>
              <div className="mt-2 h-4 w-48 bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="h-10 rounded-xl border border-slate-800 bg-slate-900/60 animate-pulse" />
            <div className="h-[460px] rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          </section>
          <div className="rounded-2xl border border-slate-700 bg-[#0B1530] h-[600px] animate-pulse" />
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
                  <span className="text-slate-400"> (Buyer)</span>
                  <span className="mx-2 text-slate-500">·</span>
                  <span className="font-medium text-slate-100">{sellerName}</span>
                  <span className="text-slate-400"> (Seller)</span>
                  <span className="mx-2 text-slate-500">·</span>
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
                      setEditDealForm({
                        address: tx?.address || '',
                        client: tx?.client || '',
                        binding_date: tx?.binding_date ? tx.binding_date.slice(0, 10) : '',
                        closing_date: tx?.closing_date ? tx.closing_date.slice(0, 10) : '',
                        purchase_price: tx?.purchase_price ? String(tx.purchase_price) : '',
                        status: tx?.status || '',
                        phase: tx?.phase || '',
                      })
                      setShowEditDealModal(true)
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
                { key: 'contract', label: 'Contract' },
                { key: 'checklist', label: 'Checklist' },
                { key: 'inspectors', label: 'Services' },
                { key: 'deadlines', label: 'Deadlines' },
                { key: 'contacts', label: 'Contacts' },
                { key: 'activity', label: 'Activity' },
                { key: 'outbox', label: 'Outbox' },
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
            {activeTab === 'contract' ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <ContractWizard transactionId={Number(txId)} transaction={tx} />
              </div>
            ) : null}
            {activeTab === 'checklist' ? checklistTab() : null}
            {activeTab === 'inspectors' ? inspectorsTab() : null}
            {activeTab === 'deadlines' ? deadlinesTab() : null}
            {activeTab === 'contacts' ? contactsTab() : null}
            {activeTab === 'activity' ? activityTab() : null}
            {activeTab === 'outbox' ? outboxTab() : null}
          </div>
        </section>

        {/* Vera panel (permanent right) */}
        <aside className="min-w-0">
          <div className="sticky top-4 rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src="/avatar-pilot.png"
                  alt="Vera"
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
                <h2 className="text-sm font-semibold text-white">Vera</h2>
              </div>
              <span className="text-xs text-slate-400">{revaSending ? 'Sending…' : 'Ready'}</span>
            </div>

            <div ref={revaScrollRef} className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
              {revaMessages.length ? (
                revaMessages.map((m) => (
                  <div key={m.id} className={classNames('rounded-xl p-3 border', m.role === 'user' ? 'border-orange-500/20 bg-orange-500/10' : 'border-slate-700 bg-slate-900/40')}>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{m.role === 'user' ? 'You' : 'Vera'}</div>
                    <div className="mt-1 text-sm whitespace-pre-wrap text-slate-200">{m.content}</div>
                    <div className="mt-2 text-[11px] text-slate-400">{formatDate(m.at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-300">
                  Ask Vera about this transaction. Example: “What’s the next best action?”
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

      {showEditDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0B1530] p-5">
            <h2 className="text-lg font-semibold text-white">Edit Deal</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-slate-300">
                Property Address
                <input value={editDealForm.address} onChange={e => setEditDealForm(f => ({ ...f, address: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 outline-none" />
              </label>
              <label className="block text-sm text-slate-300">
                Client Name
                <input value={editDealForm.client} onChange={e => setEditDealForm(f => ({ ...f, client: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 outline-none" />
              </label>
              <label className="block text-sm text-slate-300">
                Binding Date
                <input type="date" value={editDealForm.binding_date} onChange={e => setEditDealForm(f => ({ ...f, binding_date: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 outline-none" />
              </label>
              <label className="block text-sm text-slate-300">
                Closing Date
                <input type="date" value={editDealForm.closing_date} onChange={e => setEditDealForm(f => ({ ...f, closing_date: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 outline-none" />
              </label>
              <label className="block text-sm text-slate-300">
                Purchase Price
                <input type="number" value={editDealForm.purchase_price} onChange={e => setEditDealForm(f => ({ ...f, purchase_price: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 outline-none" placeholder="345000" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-slate-300">
                  Status
                  <select value={editDealForm.status} onChange={e => setEditDealForm(f => ({ ...f, status: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 outline-none">
                    <option value="active">Active</option>
                    <option value="under contract">Under Contract</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  Phase
                  <select value={editDealForm.phase} onChange={e => setEditDealForm(f => ({ ...f, phase: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 outline-none">
                    <option value="intake">Intake</option>
                    <option value="pre_contract">Pre-Contract</option>
                    <option value="under_contract">Under Contract</option>
                    <option value="inspection">Inspection</option>
                    <option value="closing">Closing</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowEditDealModal(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await patchTransaction({
                    address: editDealForm.address,
                    client: editDealForm.client,
                    binding_date: editDealForm.binding_date || null,
                    closing_date: editDealForm.closing_date || null,
                    purchase_price: editDealForm.purchase_price ? Number(editDealForm.purchase_price) : null,
                    status: editDealForm.status,
                    phase: editDealForm.phase,
                  })
                  setShowEditDealModal(false)
                  void loadPageData()
                }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const txId = params?.id ?? ''
  return <TransactionDetailContent key={txId} />
}

