'use client'

import React, { useEffect, useState } from 'react'
import ClosingPilotLogo from './ClosingPilotLogo'

export type DealSummary = {
  id: number
  address?: string
  client?: string
  status?: string
  closing_date?: string
  buyer_names?: string
}

type DealPickerModalProps = {
  open: boolean
  selectedDealId?: number | null
  title?: string
  subtitle?: string
  onClose: () => void
  onSelect: (deal: DealSummary) => void
}

export default function DealPickerModal({
  open,
  selectedDealId,
  title = 'Select a deal',
  subtitle = 'Connect your RF401 wizard to an existing transaction before proceeding.',
  onClose,
  onSelect,
}: DealPickerModalProps) {
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const controller = new AbortController()

    const loadDeals = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/transactions', { signal: controller.signal })
        if (!res.ok) {
          throw new Error('Unable to load deals')
        }
        const payload = await res.json()
        if (cancelled) return
        const list = Array.isArray(payload) ? payload : payload.result || []
        setDeals(list)
      } catch (err: any) {
        if (cancelled) return
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to load deals')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDeals()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#030712] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <ClosingPilotLogo size="sm" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{title}</p>
              <p className="text-lg font-semibold text-white">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">
            Close
          </button>
        </div>
        <div className="p-6">
          {loading && (
            <div className="text-sm text-gray-300">Loading deals…</div>
          )}
          {error && (
            <div className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-200">{error}</div>
          )}
          <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto">
            {(!loading && deals.length === 0) && (
              <div className="rounded-2xl border border-white/10 bg-[#07101a] p-3 text-sm text-gray-400">No active deals available.</div>
            )}
            {deals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => onSelect(deal)}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
                  deal.id === selectedDealId ? 'border-orange-500 bg-orange-500/5' : 'border-white/10 bg-[#050c14] hover:border-white/30'
                }`}
              >
                <div className="text-sm text-gray-400">Deal #{deal.id}</div>
                <div className="text-lg font-semibold text-white">{deal.address || deal.client || 'Unnamed deal'}</div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{deal.client || 'Unknown client'}</span>
                  <span className="text-[0.65rem] uppercase">{deal.status || 'Status unknown'}</span>
                </div>
                {deal.closing_date && (() => {
                const parsed = new Date(deal.closing_date)
                if (Number.isNaN(parsed.getTime())) {
                  return <div className="mt-2 text-xs text-cyan-300">Closing: TBD</div>
                }
                return <div className="mt-2 text-xs text-cyan-300">Closing: {parsed.toLocaleDateString()}</div>
              })()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
