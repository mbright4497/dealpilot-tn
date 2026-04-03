'use client'

import { useCallback, useEffect, useState } from 'react'

type Inspector = {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  booking_method: string | null
  booking_url: string | null
  specialties: string[] | null
  notes: string | null
  preferred: boolean | null
}

const BOOKING_OPTIONS = ['call', 'text', 'email', 'online'] as const
const SPECIALTY_OPTIONS = ['Home', 'WDI', 'Septic', 'Well', 'Mold'] as const

const bookingBadgeClass: Record<string, string> = {
  call: 'bg-red-500/20 text-red-200 border-red-500/40',
  text: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  email: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  online: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
}

const emptyForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  booking_method: 'call' as string,
  booking_url: '',
  specialties: [] as string[],
  notes: '',
  preferred: false,
}

export default function InspectorsPage() {
  const [inspectors, setInspectors] = useState<Inspector[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inspectors', { cache: 'no-store' })
      const json = await res.json()
      setInspectors(Array.isArray(json?.inspectors) ? json.inspectors : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(row: Inspector) {
    setEditingId(row.id)
    setForm({
      name: row.name || '',
      company: row.company || '',
      phone: row.phone || '',
      email: row.email || '',
      booking_method: (row.booking_method || 'call').toLowerCase(),
      booking_url: row.booking_url || '',
      specialties: Array.isArray(row.specialties) ? [...row.specialties] : [],
      notes: row.notes || '',
      preferred: Boolean(row.preferred),
    })
    setModalOpen(true)
  }

  function toggleSpecialty(label: string) {
    setForm((f) => {
      const set = new Set(f.specialties)
      if (set.has(label)) set.delete(label)
      else set.add(label)
      return { ...f, specialties: [...set] }
    })
  }

  async function save() {
    const name = form.name.trim()
    if (!name) {
      window.alert('Name is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        booking_method: form.booking_method,
        booking_url: form.booking_method === 'online' ? form.booking_url.trim() || null : null,
        specialties: form.specialties,
        notes: form.notes.trim() || null,
        preferred: form.preferred,
      }
      if (editingId) {
        const res = await fetch('/api/inspectors', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          window.alert(j?.error || 'Could not update inspector')
          return
        }
      } else {
        const res = await fetch('/api/inspectors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          window.alert(j?.error || 'Could not create inspector')
          return
        }
      }
      setModalOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this inspector from your directory?')) return
    setDeleteBusyId(id)
    try {
      const res = await fetch(`/api/inspectors?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        window.alert(j?.error || 'Could not delete')
        return
      }
      await load()
    } finally {
      setDeleteBusyId(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Inspector Directory</h1>
          <p className="mt-1 text-sm text-gray-400">Your saved inspectors for quick assignment on deals.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-600 transition"
        >
          + Add Inspector
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : inspectors.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 px-6 py-12 text-center text-slate-400">
          No inspectors yet. Add your first.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inspectors.map((row) => {
            const bm = String(row.booking_method || 'call').toLowerCase()
            const badgeCls = bookingBadgeClass[bm] || bookingBadgeClass.call
            return (
              <div
                key={row.id}
                className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 shadow-sm ring-1 ring-slate-800/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold text-white">{row.name}</div>
                    {row.company ? <div className="text-sm text-slate-400">{row.company}</div> : null}
                    {row.phone ? <div className="mt-1 text-sm text-slate-300">{row.phone}</div> : null}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {row.preferred ? (
                      <span className="rounded-full border border-orange-500/50 bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-200">
                        Preferred
                      </span>
                    ) : null}
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${badgeCls}`}>
                      {bm}
                    </span>
                  </div>
                </div>
                {Array.isArray(row.specialties) && row.specialties.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {row.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-orange-500/40"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusyId === row.id}
                    onClick={() => void remove(row.id)}
                    className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50"
                  >
                    {deleteBusyId === row.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-[#0B1530] p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Inspector' : 'Add Inspector'}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-orange-500/40"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-slate-300">
                Name <span className="text-red-400">*</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Company
                <input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Email
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Booking method
                <select
                  value={form.booking_method}
                  onChange={(e) => setForm((f) => ({ ...f, booking_method: e.target.value }))}
                  className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700"
                >
                  {BOOKING_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              {form.booking_method === 'online' ? (
                <label className="block text-sm text-slate-300">
                  Booking URL
                  <input
                    value={form.booking_url}
                    onChange={(e) => setForm((f) => ({ ...f, booking_url: e.target.value }))}
                    className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700"
                    placeholder="https://…"
                  />
                </label>
              ) : null}

              <div>
                <div className="text-sm text-slate-300">Specialties</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map((s) => (
                    <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={form.specialties.includes(s)}
                        onChange={() => toggleSpecialty(s)}
                        className="rounded border-slate-600"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <label className="block text-sm text-slate-300">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.preferred}
                  onChange={(e) => setForm((f) => ({ ...f, preferred: e.target.checked }))}
                  className="rounded border-slate-600"
                />
                Preferred
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-orange-500/40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingId ? 'Save' : 'Add Inspector'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
