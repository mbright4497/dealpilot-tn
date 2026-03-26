'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type TxPayload = { transaction: Record<string, any> | null }
type ChecklistItem = {
  id?: string
  title?: string
  category?: string
  priority?: 'critical' | 'high' | 'medium' | 'low' | string
  due_date?: string | null
  completed?: boolean
}
type DeadlineItem = {
  id?: string
  title?: string
  due_date?: string | null
  status?: 'upcoming' | 'overdue' | 'completed' | string
  critical?: boolean
  tca_reference?: string | null
}
type ContactItem = {
  role?: string
  reason?: string
  urgency?: 'immediate' | 'this_week' | 'before_closing' | string
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<TxPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  async function loadTransaction() {
    const id = params?.id
    if (!id) return
    setLoading(true)
    const res = await fetch(`/api/transactions/${id}`, { cache: 'no-store' })
    const json = await res.json()
    setData({ transaction: json.transaction || null })
    setLoading(false)
  }

  useEffect(() => {
    loadTransaction()
  }, [params?.id])

  const tx = data?.transaction

  const checklist = useMemo(() => {
    return Array.isArray(tx?.ai_checklist) ? (tx.ai_checklist as ChecklistItem[]) : []
  }, [tx?.ai_checklist])

  const deadlines = useMemo(() => {
    return Array.isArray(tx?.ai_deadlines) ? (tx.ai_deadlines as DeadlineItem[]) : []
  }, [tx?.ai_deadlines])

  const contacts = useMemo(() => {
    return Array.isArray(tx?.ai_contacts) ? (tx.ai_contacts as ContactItem[]) : []
  }, [tx?.ai_contacts])

  const summary = (tx?.ai_summary ?? null) as
    | { deal_overview?: string; immediate_actions?: string[]; risks?: string[]; missing_info?: string[] }
    | null

  const checklistPct = useMemo(() => {
    const list = checklist
    if (!list.length) return 0
    const done = list.filter((m) => Boolean(m.completed)).length
    return Math.round((done / list.length) * 100)
  }, [checklist])

  const groupedChecklist = useMemo(() => {
    return checklist.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
      const key = item.category || 'other'
      acc[key] = acc[key] || []
      acc[key].push(item)
      return acc
    }, {})
  }, [checklist])

  const hasIntelligence =
    Array.isArray(tx?.ai_checklist) &&
    Array.isArray(tx?.ai_deadlines) &&
    tx?.ai_summary &&
    Array.isArray(tx?.ai_contacts)

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

  function deadlineColor(deadline: DeadlineItem): string {
    if (String(deadline.status || '').toLowerCase() === 'overdue') return 'text-red-300'
    if (!deadline.due_date) return 'text-gray-300'
    const dueTs = new Date(deadline.due_date).getTime()
    if (Number.isNaN(dueTs)) return 'text-gray-300'
    const days = Math.ceil((dueTs - Date.now()) / (1000 * 60 * 60 * 24))
    if (days <= 7) return 'text-yellow-300'
    return 'text-green-300'
  }

  if (loading) return <main className="p-6 text-gray-300">Loading transaction...</main>
  if (!tx) return <main className="p-6 text-gray-300">Transaction not found.</main>

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-xl font-bold text-white">{tx.address || 'Untitled address'}</h2>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="rounded-full bg-blue-500/20 px-2 py-1 text-blue-300">{tx.status || 'unknown'}</span>
            <span className="rounded-full bg-purple-500/20 px-2 py-1 text-purple-300">{tx.phase || 'intake'}</span>
          </div>
          <div className="mt-4 space-y-1 text-sm text-gray-300">
            <div>Binding: {tx.binding_date || 'N/A'}</div>
            <div>Closing: {tx.closing_date || 'N/A'}</div>
            <div>Possession: {tx.possession_date || 'N/A'}</div>
            <div>Purchase price: {tx.purchase_price || 'N/A'}</div>
            <div>Earnest money: {tx.earnest_money || 'N/A'}</div>
            <div>Loan type: {tx.loan_type || 'N/A'}</div>
          </div>
        </section>

        <section className="space-y-3 lg:col-span-3">
          {!hasIntelligence && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-sm text-gray-300">Reva is analyzing this transaction...</p>
              <button
                className="mt-3 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                onClick={generateIntelligence}
                disabled={analyzing}
              >
                {analyzing ? 'Generating...' : 'Generate Intelligence'}
              </button>
            </div>
          )}

          <Panel title={`Checklist (${checklistPct}%)`}>
            {Object.entries(groupedChecklist).map(([category, items]) => (
              <div key={category} className="mb-3">
                <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">{category}</div>
                {items.map((item, idx) => (
                  <div key={`${item.id || idx}-${item.title || 'item'}`} className="mb-2 rounded bg-gray-800 p-2 text-sm text-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>{item.title || 'Checklist item'}</span>
                      <span className="rounded bg-gray-700 px-2 py-0.5 text-xs">{item.priority || 'medium'}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                      <span>Due: {item.due_date || 'N/A'}</span>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={Boolean(item.completed)} readOnly />
                        completed
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {!checklist.length && <p className="text-sm text-gray-400">No checklist items yet.</p>}
          </Panel>

          <Panel title="Deadlines">
            {deadlines.map((d, idx) => (
              <div key={`${d.id || idx}-${d.title || 'deadline'}`} className="mb-2 rounded bg-gray-800 p-2 text-sm">
                <div className={`font-medium ${deadlineColor(d)}`}>{d.title || 'Deadline'}</div>
                <div className="text-xs text-gray-400">Due: {d.due_date || 'N/A'}</div>
                {d.tca_reference ? (
                  <div className="mt-1 text-xs text-orange-300">TCA: {d.tca_reference}</div>
                ) : null}
              </div>
            ))}
            {!deadlines.length && <p className="text-sm text-gray-400">No deadlines yet.</p>}
          </Panel>

          <Panel title="Summary">
            <p className="text-sm text-gray-300">{summary?.deal_overview || 'No summary yet.'}</p>
            <div className="mt-3">
              <h4 className="text-xs uppercase tracking-wide text-gray-400">Immediate Actions</h4>
              <ul className="mt-1 list-disc pl-4 text-sm text-gray-300">
                {(summary?.immediate_actions || []).map((action, idx) => (
                  <li key={`${action}-${idx}`}>{action}</li>
                ))}
              </ul>
            </div>
            {(summary?.risks || []).length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs uppercase tracking-wide text-gray-400">Risks</h4>
                <ul className="mt-1 list-disc pl-4 text-sm text-red-300">
                  {(summary?.risks || []).map((risk, idx) => (
                    <li key={`${risk}-${idx}`}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {(summary?.missing_info || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(summary?.missing_info || []).map((item, idx) => (
                  <span key={`${item}-${idx}`} className="rounded bg-orange-500/20 px-2 py-1 text-xs text-orange-300">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Contacts Needed">
            {contacts.map((c, idx) => (
              <div key={`${c.role || idx}-${c.reason || 'contact'}`} className="mb-2 rounded bg-gray-800 p-2 text-sm text-gray-300">
                <div className="font-medium text-white">{c.role || 'contact'}</div>
                <div className="text-xs text-gray-400">{c.reason || 'No reason provided'}</div>
                <span className="mt-1 inline-block rounded bg-gray-700 px-2 py-0.5 text-xs">{c.urgency || 'this_week'}</span>
              </div>
            ))}
            {!contacts.length && <p className="text-sm text-gray-400">No contacts needed listed yet.</p>}
          </Panel>
        </section>
      </div>
    </main>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}
