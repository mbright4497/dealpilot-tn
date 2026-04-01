'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Transaction = {
  id: number
  address: string | null
  client: string | null
  status: string | null
  phase: string | null
  closing_date: string | null
  created_at: string | null
}

type SortMode = 'closing_date' | 'created_at' | 'status'

function daysToClose(closingDate: string | null): number | null {
  if (!closingDate) return null
  const ms = new Date(closingDate).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'closed'>('all')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('closing_date')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    address: '',
    city: '',
    client: '',
    side: 'buyer',
    closing_date: '',
  })

  async function loadTransactions() {
    setLoading(true)
    try {
      const res = await fetch('/api/transactions', { cache: 'no-store' })
      const json = await res.json()
      setTransactions(Array.isArray(json?.transactions) ? json.transactions : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = transactions
      .filter((tx) => {
        if (filter === 'all') return true
        return (tx.status || '').toLowerCase() === filter
      })
      .filter((tx) => {
        if (!normalizedQuery) return true
        return `${tx.address || ''} ${tx.client || ''}`.toLowerCase().includes(normalizedQuery)
      })

    return filtered.sort((a, b) => {
      if (sortMode === 'status') return String(a.status || '').localeCompare(String(b.status || ''))
      if (sortMode === 'created_at') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      return new Date(a.closing_date || 0).getTime() - new Date(b.closing_date || 0).getTime()
    })
  }, [filter, query, sortMode, transactions])

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Transactions</h1>
          <p className="mt-1 text-sm text-gray-400">Manage every deal through Reva and API routes.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-500/20 px-3 py-1 text-sm font-semibold text-orange-300">{visible.length}</span>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'active', 'pending', 'closed'] as const).map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-4 py-2 text-sm ${filter === tab ? 'bg-orange-500 text-black' : 'bg-gray-800 text-gray-300'}`}
            onClick={() => setFilter(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-2 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address or client name"
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-1 ring-gray-700"
        />
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white ring-1 ring-gray-700"
        >
          <option value="closing_date">Sort: Closing date</option>
          <option value="created_at">Sort: Created date</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>

      {loading ? <p className="text-gray-400">Loading transactions...</p> : null}
      {!loading && visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
          No transactions yet. Ask Reva to start one, or click Add below.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((tx) => {
          const days = daysToClose(tx.closing_date)
          return (
            <button
              key={tx.id}
              onClick={() => window.location.href = `/transactions/${tx.id}`}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-left hover:border-orange-500/60"
            >
              <div className="text-lg font-bold text-white">{tx.address || 'Untitled property'}</div>
              <div className="mt-1 text-sm text-gray-300">{tx.client || 'No client name'}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-500/20 px-2 py-1 text-blue-300">{tx.status || 'unknown'}</span>
                <span className="rounded-full bg-purple-500/20 px-2 py-1 text-purple-300">{tx.phase || 'intake'}</span>
              </div>
              <div className="mt-3 text-sm text-gray-300">Days to close: {days ?? 'N/A'}</div>
              <div className="text-sm text-gray-300">Closing: {tx.closing_date || 'Not set'}</div>
              <div className="mt-3 h-2 rounded bg-gray-800">
                <div className="h-2 rounded bg-orange-500" style={{ width: `${Math.max(10, Math.min(100, 100 - Math.max(days || 0, 0)))}%` }} />
              </div>
            </button>
          )
        })}
      </div>

      <Link href="/chat" className="mt-6 inline-block text-sm text-gray-400 hover:text-white">
        Back to dashboard
      </Link>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-950 p-5">
            <h2 className="text-lg font-semibold text-white">New Transaction</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-gray-300">
                Property Address
                <input
                  value={createForm.address}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white ring-1 ring-gray-700 outline-none"
                />
              </label>
              <label className="block text-sm text-gray-300">
                City
                <input
                  value={createForm.city}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white ring-1 ring-gray-700 outline-none"
                />
              </label>
              <label className="block text-sm text-gray-300">
                Client Name
                <input
                  value={createForm.client}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, client: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white ring-1 ring-gray-700 outline-none"
                />
              </label>
              <label className="block text-sm text-gray-300">
                Buyer or Seller?
                <select
                  value={createForm.side}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, side: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white ring-1 ring-gray-700 outline-none"
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </select>
              </label>
              <label className="block text-sm text-gray-300">
                Closing Date (optional)
                <input
                  type="date"
                  value={createForm.closing_date}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, closing_date: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white ring-1 ring-gray-700 outline-none"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !createForm.address.trim() || !createForm.city.trim() || !createForm.client.trim()}
                onClick={async () => {
                  setCreating(true)
                  try {
                    const res = await fetch('/api/transactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        address: createForm.address.trim(),
                        city: createForm.city.trim(),
                        client: createForm.client.trim(),
                        type: createForm.side,
                        closing_date: createForm.closing_date || null,
                      }),
                    })
                    const json = await res.json()
                    if (!res.ok || !json?.transaction?.id) {
                      throw new Error(json?.error || 'Failed to create transaction')
                    }
                    setShowCreateModal(false)
                    router.push(`/transactions/${json.transaction.id}?created=1`)
                  } catch (e) {
                    const message = e instanceof Error ? e.message : 'Failed to create transaction'
                    window.alert(message)
                  } finally {
                    setCreating(false)
                  }
                }}
                className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create with Reva'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </main>
  )
}
