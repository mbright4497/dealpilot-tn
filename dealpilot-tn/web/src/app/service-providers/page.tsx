'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const CATEGORY_ORDER = [
  'inspector',
  'contractor',
  'lender',
  'title_company',
  'attorney',
  'other',
] as const

const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  inspector: 'Inspector',
  contractor: 'Contractor',
  lender: 'Lender',
  title_company: 'Title Company',
  attorney: 'Attorney',
  other: 'Other',
}

const INSPECTION_TYPE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'wdi', label: 'WDI' },
  { value: 'septic', label: 'Septic' },
  { value: 'well', label: 'Well' },
  { value: 'mold', label: 'Mold' },
  { value: 'radon', label: 'Radon' },
] as const

type InspectorEmbed = {
  id?: string
  name?: string | null
  company?: string | null
  phone?: string | null
  email?: string | null
  category?: string | null
  booking_method?: string | null
} | null

type TransactionEmbed = { id?: number; address?: string | null } | null

type AssignmentRow = {
  id: string
  transaction_id: number
  inspection_type?: string | null
  scheduled_at?: string | null
  status?: string | null
  inspectors?: InspectorEmbed | InspectorEmbed[]
  transactions?: TransactionEmbed | TransactionEmbed[]
}

function normalizeCategory(c: string | null | undefined): (typeof CATEGORY_ORDER)[number] {
  const v = (c || 'other').toLowerCase()
  if ((CATEGORY_ORDER as readonly string[]).includes(v)) return v as (typeof CATEGORY_ORDER)[number]
  return 'other'
}

function pickInspector(row: AssignmentRow): Record<string, unknown> | null {
  const raw = row.inspectors
  if (!raw) return null
  const one = Array.isArray(raw) ? raw[0] : raw
  return one && typeof one === 'object' ? (one as Record<string, unknown>) : null
}

function pickTransaction(row: AssignmentRow): { id: number; address: string } | null {
  const raw = row.transactions
  if (!raw) return null
  const one = Array.isArray(raw) ? raw[0] : raw
  if (!one || typeof one !== 'object') return null
  const id = (one as { id?: number }).id
  const address = (one as { address?: string | null }).address
  if (typeof id !== 'number') return null
  return { id, address: address != null ? String(address) : '—' }
}

function inspectionLabel(v: string | null | undefined): string {
  const key = String(v || 'home').toLowerCase()
  const found = INSPECTION_TYPE_OPTIONS.find((o) => o.value === key)
  return found?.label || key
}

function statusBadge(st: string | null | undefined): { cls: string; label: string } {
  const s = String(st || 'pending').toLowerCase()
  if (s === 'scheduled') {
    return { cls: 'border-sky-500/40 bg-sky-500/15 text-sky-100', label: 'Scheduled' }
  }
  if (s === 'completed') {
    return { cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100', label: 'Completed' }
  }
  return { cls: 'border-amber-500/40 bg-amber-500/15 text-amber-100', label: 'Pending' }
}

export default function ServiceProvidersPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/service-providers', { cache: 'no-store' })
      const json = await res.json()
      setAssignments(Array.isArray(json?.assignments) ? json.assignments : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sections = useMemo(() => {
    const groups = new Map<(typeof CATEGORY_ORDER)[number], AssignmentRow[]>()
    for (const row of assignments) {
      const insp = pickInspector(row)
      const cat = normalizeCategory(typeof insp?.category === 'string' ? insp.category : null)
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(row)
    }
    const sortRows = (a: AssignmentRow, b: AssignmentRow) => {
      const ta = pickTransaction(a)?.address || ''
      const tb = pickTransaction(b)?.address || ''
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' })
    }
    return CATEGORY_ORDER.filter((k) => groups.has(k)).map((k) => ({
      key: k,
      label: CATEGORY_LABELS[k],
      rows: groups.get(k)!.sort(sortRows),
    }))
  }, [assignments])

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Service Providers</h1>
          <p className="mt-1 text-sm text-gray-400">
            Providers assigned across your transactions, grouped by role.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inspectors"
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-orange-500/40"
          >
            Manage directory
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : assignments.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 px-6 py-12 text-center text-slate-400">
          <p>No service providers assigned on any deal yet.</p>
          <p className="mt-2 text-sm">
            Open a transaction, use the <span className="text-slate-300">Services</span> tab, or{' '}
            <Link href="/inspectors" className="text-orange-400 hover:underline">
              add providers to your directory
            </Link>{' '}
            first.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map((sec) => (
            <section key={sec.key}>
              <h2 className="mb-4 text-lg font-semibold text-white">{sec.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sec.rows.map((row) => {
                  const insp = pickInspector(row)
                  const tx = pickTransaction(row)
                  const name = insp?.name != null ? String(insp.name) : 'Service provider'
                  const company = insp?.company != null ? String(insp.company) : ''
                  const phone = insp?.phone != null ? String(insp.phone) : ''
                  const email = insp?.email != null ? String(insp.email) : ''
                  const badge = statusBadge(row.status)
                  return (
                    <div
                      key={row.id}
                      className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-white">{name}</div>
                          {company ? <div className="text-sm text-slate-400">{company}</div> : null}
                          {phone ? <div className="mt-1 text-sm text-slate-300">{phone}</div> : null}
                          {email ? <div className="mt-0.5 truncate text-sm text-slate-400">{email}</div> : null}
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        <div>
                          Service type:{' '}
                          <span className="font-medium text-slate-300">
                            {inspectionLabel(row.inspection_type)}
                          </span>
                        </div>
                        {tx ? (
                          <div>
                            Deal:{' '}
                            <Link
                              href={`/transactions/${tx.id}`}
                              className="font-medium text-orange-400 hover:underline"
                            >
                              {tx.address}
                            </Link>
                          </div>
                        ) : (
                          <div className="text-slate-500">Deal: —</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
