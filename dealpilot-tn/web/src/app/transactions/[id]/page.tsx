'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

type TxPayload = {
  transaction: Record<string, any> | null
  documents: Array<Record<string, any>>
}

type TabKey = 'overview' | 'documents' | 'checklist' | 'deadlines' | 'contacts' | 'notes'
type ChatLine = { role: 'user' | 'assistant'; content: string; at: string }
type ChecklistItem = Record<string, any>
type DeadlineItem = Record<string, any>
type ContactItem = Record<string, any>

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'documents', label: 'Documents' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'deadlines', label: 'Deadlines' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'notes', label: 'Notes' },
]

function formatDate(value: string | null | undefined): string {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString()
}

function daysBetween(fromDate: string | null | undefined, toDate: string | null | undefined): number | null {
  if (!toDate) return null
  const from = fromDate ? new Date(fromDate) : new Date()
  const to = new Date(toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function priorityClass(priority: string): string {
  const value = String(priority || 'medium').toLowerCase()
  if (value === 'critical') return 'bg-red-500/20 text-red-200'
  if (value === 'high') return 'bg-orange-500/20 text-orange-200'
  if (value === 'low') return 'bg-green-500/20 text-green-200'
  return 'bg-yellow-500/20 text-yellow-200'
}

function deadlineCardClass(deadline: DeadlineItem): string {
  const due = deadline?.due_date ? new Date(deadline.due_date) : null
  const status = String(deadline?.status || '').toLowerCase()
  if (status === 'overdue') return 'border-red-500/40 bg-red-950/40'
  if (!due || Number.isNaN(due.getTime())) return 'border-slate-700 bg-slate-900/70'
  const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'border-red-500/40 bg-red-950/40'
  if (days <= 7) return 'border-yellow-500/40 bg-yellow-950/40'
  return 'border-green-500/40 bg-green-950/40'
}

function docRequirementsByType(type: string): Record<string, Array<{ name: string; required: boolean }>> {
  const isSeller = type.toLowerCase().includes('seller')
  return {
    intake: [
      { name: 'Executed Contract PDF', required: true },
      { name: isSeller ? 'Seller Property Disclosure' : 'Buyer Pre-Approval', required: true },
      { name: 'Agency Agreement', required: false },
    ],
    under_contract: [
      { name: 'Earnest Money Receipt', required: true },
      { name: 'Inspection Report', required: false },
      { name: 'Repair Amendment', required: false },
    ],
    closing: [
      { name: 'Final Closing Disclosure', required: true },
      { name: 'Title Commitment', required: true },
      { name: 'Walkthrough Acknowledgement', required: false },
    ],
  }
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<TxPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatText, setChatText] = useState('')
  const [chatThreadId, setChatThreadId] = useState<string | null>(null)
  const [chatLines, setChatLines] = useState<ChatLine[]>([])
  const [chatSending, setChatSending] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const contractUploadRef = useRef<HTMLInputElement | null>(null)

  async function loadTransaction() {
    const id = params?.id
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${id}`, { cache: 'no-store' })
      const json = await res.json()
      setData({
        transaction: json.transaction || null,
        documents: Array.isArray(json.documents) ? json.documents : [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransaction()
  }, [params?.id])

  const tx = data?.transaction
  const documents = data?.documents || []

  const checklist = useMemo(() => (Array.isArray(tx?.ai_checklist) ? (tx.ai_checklist as ChecklistItem[]) : []), [tx?.ai_checklist])
  const deadlines = useMemo(() => (Array.isArray(tx?.ai_deadlines) ? (tx.ai_deadlines as DeadlineItem[]) : []), [tx?.ai_deadlines])
  const contacts = useMemo(() => (Array.isArray(tx?.ai_contacts) ? (tx.ai_contacts as ContactItem[]) : []), [tx?.ai_contacts])
  const summary = (tx?.ai_summary ?? null) as
    | { deal_overview?: string; immediate_actions?: string[]; risks?: string[]; missing_info?: string[] }
    | null

  const checklistPct = useMemo(() => {
    if (!checklist.length) return 0
    const done = checklist.filter((item) => Boolean(item.completed)).length
    return Math.round((done / checklist.length) * 100)
  }, [checklist])

  const groupedChecklist = useMemo(() => {
    return checklist.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
      const key = String(item.category || 'General')
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [checklist])

  const notes = useMemo(() => {
    if (Array.isArray(tx?.notes)) return tx.notes as Array<{ text: string; created_at: string }>
    return []
  }, [tx?.notes])

  const daysToClose = daysBetween(tx?.binding_date, tx?.closing_date)
  const docRequirements = docRequirementsByType(String(tx?.type || tx?.client_type || 'buyer'))

  async function patchTransaction(payload: Record<string, any>) {
    if (!params?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Update failed')
      await loadTransaction()
    } finally {
      setSaving(false)
    }
  }

  async function generateIntelligence() {
    if (!params?.id) return
    setAnalyzing(true)
    try {
      await fetch(`/api/transactions/${params.id}/analyze`, { method: 'POST' })
      await loadTransaction()
    } finally {
      setAnalyzing(false)
    }
  }

  async function removeContract() {
    if (!params?.id) return
    const ok = window.confirm(
      'Are you sure you want to remove this contract?\nThis cannot be undone.'
    )
    if (!ok) return

    const res = await fetch(`/api/transactions/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_pdf_url: null,
        contract_data: null,
      }),
    })
    if (!res.ok) {
      window.alert('Failed to remove contract.')
      return
    }
    await loadTransaction()
    router.refresh()
  }

  async function uploadContractFile(file: File) {
    if (!params?.id) return
    const fd = new FormData()
    fd.append('file', file)
    const uploadRes = await fetch(`/api/documents/${params.id}`, {
      method: 'POST',
      body: fd,
    })
    if (!uploadRes.ok) {
      window.alert('Contract upload failed.')
      return
    }
    await loadTransaction()
    router.refresh()
  }

  async function toggleChecklistItem(index: number) {
    if (!checklist[index]) return
    const next = checklist.map((item, i) => (i === index ? { ...item, completed: !item.completed } : item))
    await patchTransaction({ ai_checklist: next })
  }

  async function addNote() {
    const text = noteInput.trim()
    if (!text) return
    const next = [...notes, { text, created_at: new Date().toISOString() }]
    await patchTransaction({ notes: next })
    setNoteInput('')
  }

  async function askReva(message: string) {
    if (!params?.id || !message.trim()) return
    const line: ChatLine = { role: 'user', content: message.trim(), at: new Date().toISOString() }
    setChatLines((prev) => [...prev, line])
    setChatText('')
    setChatSending(true)
    try {
      const res = await fetch('/api/reva/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: line.content,
          dealId: Number(params.id),
          threadId: chatThreadId,
          context: 'transaction_detail',
        }),
      })
      const json = await res.json()
      if (json?.threadId && !chatThreadId) setChatThreadId(json.threadId)
      setChatLines((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: String(json?.reply || 'Reva could not answer this right now.'),
          at: new Date().toISOString(),
        },
      ])
    } catch {
      setChatLines((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Reva is temporarily unavailable. Please try again.',
          at: new Date().toISOString(),
        },
      ])
    } finally {
      setChatSending(false)
    }
  }

  if (loading) return <main className="p-6 text-slate-300">Loading transaction...</main>
  if (!tx) return <main className="p-6 text-slate-300">Transaction not found.</main>

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-slate-100">
      <div className="rounded-2xl border border-slate-700 bg-[#0B1530] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{tx.address || 'Untitled property'}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-blue-200">{tx.status || 'unknown'}</span>
              <span className="rounded-full bg-orange-500/20 px-2.5 py-1 text-orange-200">{tx.phase || 'intake'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setChatOpen(true)
                askReva(`Give me a concise update for transaction ${params.id}.`)
              }}
              className="rounded-lg border border-orange-400/40 bg-orange-500/20 px-3 py-2 text-sm font-medium text-orange-100 hover:bg-orange-500/30"
            >
              Ask Reva
            </button>
            <button
              onClick={() => contractUploadRef.current?.click()}
              className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Upload Contract
            </button>
            <button
              onClick={generateIntelligence}
              disabled={analyzing}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {analyzing ? 'Generating...' : 'Generate Intelligence'}
            </button>
            <input
              ref={contractUploadRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadContractFile(file)
                e.currentTarget.value = ''
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm sm:grid-cols-3">
          <div>Binding: <span className="text-white">{formatDate(tx.binding_date)}</span></div>
          <div>Closing: <span className="text-white">{formatDate(tx.closing_date)}</span></div>
          <div>Days to close: <span className="text-white">{daysToClose ?? 'N/A'}</span></div>
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2 border-b border-slate-700 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              activeTab === tab.key
                ? 'bg-orange-500 text-black'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="mt-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <Panel title="AI Summary">
              <p className="text-sm text-slate-200">{summary?.deal_overview || 'No AI summary yet.'}</p>

              <div className="mt-4">
                <h3 className="text-xs uppercase tracking-wide text-slate-400">Immediate actions</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(summary?.immediate_actions || []).map((item, idx) => (
                    <span key={`${item}-${idx}`} className="rounded-full bg-orange-500/20 px-2.5 py-1 text-xs text-orange-200">
                      {item}
                    </span>
                  ))}
                  {!summary?.immediate_actions?.length && <span className="text-sm text-slate-400">No immediate actions.</span>}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-xs uppercase tracking-wide text-slate-400">Missing info</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(summary?.missing_info || []).map((item, idx) => (
                    <span key={`${item}-${idx}`} className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs text-red-200">
                      {item}
                    </span>
                  ))}
                  {!summary?.missing_info?.length && <span className="text-sm text-slate-400">No missing info.</span>}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-xs uppercase tracking-wide text-slate-400">Risks</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(summary?.risks || []).map((item, idx) => (
                    <span key={`${item}-${idx}`} className="rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs text-yellow-200">
                      {item}
                    </span>
                  ))}
                  {!summary?.risks?.length && <span className="text-sm text-slate-400">No risks identified.</span>}
                </div>
              </div>
            </Panel>

            <Panel title="Key Deal Info">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <InfoCell label="Purchase price" value={tx.purchase_price} />
                <InfoCell label="Earnest money" value={tx.earnest_money} />
                <InfoCell label="Loan type" value={tx.loan_type} />
                <InfoCell label="Inspection period" value={tx.inspection_period} />
                <InfoCell label="County" value={tx.county || tx.county_name} />
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            {(['intake', 'under_contract', 'closing'] as const).map((phase) => (
              <Panel key={phase} title={phase === 'under_contract' ? 'Under Contract' : phase[0].toUpperCase() + phase.slice(1)}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-slate-300">Upload and manage required documents for this phase.</p>
                  <button
                    onClick={() => contractUploadRef.current?.click()}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    Upload
                  </button>
                </div>
                <div className="space-y-2">
                  {(docRequirements[phase] || []).map((req) => {
                    const hasDoc =
                      req.name === 'Executed Contract PDF'
                        ? Boolean(tx.contract_pdf_url)
                        : documents.some((doc) => String(doc.name || '').toLowerCase().includes(req.name.toLowerCase()))
                    return (
                      <div key={req.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2.5">
                        <div>
                          <div className="text-sm font-medium text-white">{req.name}</div>
                          <div className="mt-1 flex gap-2 text-xs">
                            <span className={`rounded-full px-2 py-0.5 ${req.required ? 'bg-red-500/20 text-red-200' : 'bg-slate-700 text-slate-200'}`}>
                              {req.required ? 'Required' : 'Conditional'}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 ${hasDoc ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}`}>
                              {hasDoc ? 'Uploaded' : 'Missing'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => contractUploadRef.current?.click()}
                            className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-black"
                          >
                            Upload
                          </button>
                          {req.name === 'Executed Contract PDF' && tx.contract_pdf_url ? (
                            <button
                              onClick={removeContract}
                              className="rounded-md border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-100"
                            >
                              Remove Contract
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            ))}
          </div>
        )}

        {activeTab === 'checklist' && (
          <Panel title={`Checklist (${checklistPct}% complete)`}>
            <div className="mb-3 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-orange-500" style={{ width: `${checklistPct}%` }} />
            </div>
            {Object.entries(groupedChecklist).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-400">{category}</h3>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <label key={`${item.id || idx}-${item.title || 'check'}`} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(item.completed)}
                          onChange={() => void toggleChecklistItem(checklist.indexOf(item))}
                        />
                        <span className="text-sm text-slate-100">{item.title || 'Checklist item'}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass(String(item.priority || 'medium'))}`}>
                        {item.priority || 'medium'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {!checklist.length && <p className="text-sm text-slate-400">No checklist items yet.</p>}
          </Panel>
        )}

        {activeTab === 'deadlines' && (
          <Panel title="Deadlines">
            <div className="space-y-2">
              {deadlines.map((deadline, idx) => (
                <div
                  key={`${deadline.id || idx}-${deadline.title || 'deadline'}`}
                  className={`rounded-lg border p-3 ${deadlineCardClass(deadline)}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-white">{deadline.title || 'Deadline item'}</div>
                      <div className="text-xs text-slate-300">Due: {formatDate(deadline.due_date)}</div>
                      {deadline.tca_reference ? <div className="text-xs text-orange-200">TCA: {deadline.tca_reference}</div> : null}
                    </div>
                    <button
                      onClick={() => {
                        setChatOpen(true)
                        askReva(`Explain this deadline and next action: ${deadline.title || 'deadline'}`)
                      }}
                      className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-700"
                    >
                      Ask Reva about this deadline
                    </button>
                  </div>
                </div>
              ))}
              {!deadlines.length && <p className="text-sm text-slate-400">No deadlines yet.</p>}
            </div>
          </Panel>
        )}

        {activeTab === 'contacts' && (
          <Panel title="Contacts">
            <div className="mb-3 flex items-center justify-end">
              <button
                onClick={() => window.alert('Add contact workflow can be connected to your contacts API next.')}
                className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-black"
              >
                Add contact
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {contacts.map((contact, idx) => (
                <div key={`${contact.role || idx}-${contact.name || 'contact'}`} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                  <div className="text-xs uppercase tracking-wide text-orange-200">{contact.role || 'Contact'}</div>
                  <div className="mt-1 text-sm font-medium text-white">{contact.name || 'Unnamed contact'}</div>
                  <div className="text-xs text-slate-300">{contact.email || 'No email'}</div>
                  <div className="text-xs text-slate-300">{contact.phone || 'No phone'}</div>
                  <button
                    onClick={() => {
                      setChatOpen(true)
                      askReva(`Draft an email to ${contact.name || 'this contact'} about transaction ${params.id}.`)
                    }}
                    className="mt-2 rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-700"
                  >
                    Ask Reva to draft email
                  </button>
                </div>
              ))}
            </div>
            {!contacts.length && <p className="text-sm text-slate-400">No contacts listed yet.</p>}
          </Panel>
        )}

        {activeTab === 'notes' && (
          <Panel title="Notes">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add a note for this transaction..."
              className="h-28 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => void addNote()}
                disabled={saving}
                className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-60"
              >
                Save notes
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {notes.map((note, idx) => (
                <div key={`${note.created_at || idx}`} className="rounded-lg border border-slate-700 bg-slate-900/70 p-2.5">
                  <div className="text-sm text-slate-100">{note.text}</div>
                  <div className="mt-1 text-xs text-slate-400">{formatDate(note.created_at)}</div>
                </div>
              ))}
              {!notes.length && <p className="text-sm text-slate-400">No notes yet.</p>}
            </div>
          </Panel>
        )}
      </section>

      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-20 rounded-full bg-orange-500 px-4 py-3 text-sm font-bold text-black shadow-lg"
      >
        Reva
      </button>

      <div className={`fixed right-0 top-0 z-30 h-full w-full max-w-md border-l border-slate-700 bg-[#0A1022] p-4 shadow-2xl transition-transform duration-300 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Reva Chat</h2>
          <button onClick={() => setChatOpen(false)} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">Close</button>
        </div>
        <p className="mb-3 text-xs text-slate-400">Context loaded for transaction #{params.id}.</p>
        <div className="mb-3 h-[65vh] space-y-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-2">
          {chatLines.map((line, idx) => (
            <div key={`${line.at}-${idx}`} className={`rounded-lg p-2 text-sm ${line.role === 'assistant' ? 'bg-slate-800 text-slate-100' : 'bg-orange-500/20 text-orange-100'}`}>
              {line.content}
            </div>
          ))}
          {!chatLines.length && <p className="text-sm text-slate-400">Ask Reva anything about this deal.</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Ask Reva..."
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={() => void askReva(chatText)}
            disabled={chatSending}
            className="rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#111B36] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">{title}</h2>
      {children}
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2.5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value ?? 'N/A'}</div>
    </div>
  )
}
