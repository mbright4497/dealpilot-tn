'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type TxPayload = {
  transaction: Record<string, any> | null
  deadlines: Record<string, any>[]
  contacts: Record<string, any>[]
  milestones: Record<string, any>[]
  documents: Record<string, any>[]
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<TxPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [ask, setAsk] = useState('')

  useEffect(() => {
    const id = params?.id
    if (!id) return
    ;(async () => {
      setLoading(true)
      const res = await fetch(`/api/transactions/${id}`, { cache: 'no-store' })
      const json = await res.json()
      setData({
        transaction: json.transaction || null,
        deadlines: json.deadlines || [],
        contacts: json.contacts || [],
        milestones: json.milestones || [],
        documents: json.documents || [],
      })
      setLoading(false)
    })()
  }, [params?.id])

  const tx = data?.transaction
  const checklistPct = useMemo(() => {
    const list = data?.milestones || []
    if (!list.length) return 0
    const done = list.filter((m) => ['done', 'completed'].includes(String(m.status || '').toLowerCase())).length
    return Math.round((done / list.length) * 100)
  }, [data?.milestones])

  if (loading) return <main className="p-6 text-gray-300">Loading transaction...</main>
  if (!tx) return <main className="p-6 text-gray-300">Transaction not found.</main>

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-xl font-bold text-white">{tx.address || 'Untitled address'}</h2>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(String(tx.address || ''))}`}
            target="_blank"
            className="mt-1 inline-block text-sm text-orange-300"
            rel="noreferrer"
          >
            Open map
          </a>
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
          <button className="mt-4 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white">Edit</button>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <button className="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-black">MagicDoc Drive Mode</button>
          <button className="mt-2 w-full rounded-lg bg-gray-800 px-4 py-3 text-sm text-white">Upload Contract (AI)</button>
          <div className="mt-3 rounded-lg bg-gray-800 p-3 text-sm text-gray-300">Contract summary appears here after upload.</div>
          <div className="mt-3">
            <label className="text-sm text-gray-300">Ask Reva (this transaction)</label>
            <div className="mt-2 flex gap-2">
              <input
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="Ask about this deal..."
              />
              <button
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black"
                onClick={async () => {
                  if (!ask.trim()) return
                  await fetch('/api/reva/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: ask, dealId: Number(params.id) }),
                  })
                  setAsk('')
                }}
              >
                Send
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <Panel title="Contacts" ask="What contacts am I missing for this transaction?" onAsk={setAsk}>
            {(data.contacts || []).slice(0, 6).map((c, idx) => (
              <div key={idx} className="text-sm text-gray-300">{c.name || c.role || 'Contact'}</div>
            ))}
          </Panel>
          <Panel title="Deadlines" ask="What deadlines need attention on this transaction?" onAsk={setAsk}>
            {(data.deadlines || []).slice(0, 3).map((d, idx) => (
              <div key={idx} className="text-sm text-gray-300">{d.name || d.label || 'Deadline'} - {d.due_date || d.due_at || 'N/A'}</div>
            ))}
          </Panel>
          <Panel title="Checklist" ask="What checklist items are still open on this transaction?" onAsk={setAsk}>
            <div className="text-sm text-gray-300">Completion: {checklistPct}%</div>
          </Panel>
          <Panel title="Documents" ask="What documents are still missing on this transaction?" onAsk={setAsk}>
            {(data.documents || []).slice(0, 4).map((doc, idx) => (
              <div key={idx} className="text-sm text-gray-300">{doc.name || doc.file_name || 'Document'}</div>
            ))}
          </Panel>
        </section>
      </div>
    </main>
  )
}

function Panel({
  title,
  ask,
  onAsk,
  children,
}: {
  title: string
  ask: string
  onAsk: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button className="text-xs text-orange-300" onClick={() => onAsk(ask)}>Ask Reva</button>
      </div>
      {children}
    </div>
  )
}
