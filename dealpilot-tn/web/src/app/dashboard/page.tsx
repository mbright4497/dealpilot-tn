// web/src/app/dashboard/page.tsx
"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [transactions, setTransactions] = React.useState<any[]>([])
  const [briefingLoading, setBriefingLoading] = React.useState(true)
  const [briefingError, setBriefingError] = React.useState<string | null>(null)
  const [briefing, setBriefing] = React.useState<any>(null)

  const now = React.useMemo(() => new Date(), [])

  const fmtDate = (d?: any) => {
    if (!d) return "—"
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return "—"
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  }

  const daysUntil = (d?: any) => {
    if (!d) return null
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return null
    const diff = dt.getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const safeLower = (v: any) => String(v || "").toLowerCase()

  const isActiveLike = (t: any) => {
    const s = safeLower(t?.status)
    if (s.includes("closed") || s.includes("cancel")) return false
    return true
  }

  const healthFor = (t: any) => {
    const closeDays = daysUntil(t?.closing)
    if (closeDays === null) return { label: "Attention", tone: "yellow" }
    if (closeDays < 0) return { label: "At Risk", tone: "red" }
    if (closeDays <= 7) return { label: "Attention", tone: "yellow" }
    return { label: "Healthy", tone: "green" }
  }

  const badgeClass = (tone: string) => {
    if (tone === "green") return "bg-green-600 text-white"
    if (tone === "yellow") return "bg-yellow-600 text-black"
    return "bg-red-600 text-white"
  }

  React.useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError(null)
      setBriefingLoading(true)
      setBriefingError(null)

      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("updated_at", { ascending: false })

        if (error) throw error
        if (cancelled) return

        const rows = Array.isArray(data) ? data : []
        setTransactions(rows)
        setLoading(false)

        const activeDeals = rows.filter(isActiveLike)

        const deadlines: any[] = []
        for (const t of activeDeals) {
          const binding = t?.binding ? { kind: "Binding", date: t.binding } : null
          const closing = t?.closing ? { kind: "Closing", date: t.closing } : null
          const candidates = [binding, closing].filter(Boolean) as any[]
          for (const c of candidates) {
            const d = daysUntil(c.date)
            if (d === null) continue
            if (d < 0 || d <= 21) {
              deadlines.push({
                id: t.id,
                address: t.address,
                client: t.client,
                type: t.type,
                status: t.status,
                kind: c.kind,
                date: c.date,
                days: d,
              })
            }
          }
        }

        deadlines.sort((a, b) => {
          if (a.days < 0 && b.days < 0) return a.days - b.days
          if (a.days < 0) return -1
          if (b.days < 0) return 1
          return a.days - b.days
        })

        let healthy = 0
        let attention = 0
        let atRisk = 0
        for (const t of activeDeals) {
          const h = healthFor(t)
          if (h.label === "Healthy") healthy++
          else if (h.label === "Attention") attention++
          else atRisk++
        }

        const focusDeals = activeDeals
          .map((t: any) => ({
            ...t,
            health: healthFor(t),
          }))
          .sort((a: any, b: any) => {
            const ax = daysUntil(a.closing) ?? 9999
            const bx = daysUntil(b.closing) ?? 9999
            return ax - bx
          })
          .slice(0, 5)

        setBriefing({
          generatedAt: new Date().toISOString(),
          activeCount: activeDeals.length,
          totalCount: rows.length,
          health: { healthy, attention, atRisk },
          deadlines: deadlines.slice(0, 8),
          focusDeals,
        })

        setBriefingLoading(false)
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message || "Failed to load dashboard")
        setBriefingError(e?.message || "Failed to load daily briefing")
        setLoading(false)
        setBriefingLoading(false)
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  const statusCounts = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      const key = String(t?.status || "Unknown")
      map[key] = (map[key] || 0) + 1
    }
    return Object.entries(map)
  }, [transactions])

  return (
    <div className="min-h-screen bg-[#0a1929] text-white p-6 space-y-6">
      {/* Notification banner */}
      {/* @ts-ignore */}
      {typeof window !== 'undefined' && React.createElement(require('@/components/dashboard/NotificationBanner').default)}

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
          <p className="text-gray-300">
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#16213e] rounded-2xl p-6">
          <h2 className="text-lg font-semibold">EVA Daily Briefing</h2>

          <div className="mt-4">
            {/* lazy load briefing card */}
            <div>
              {/* @ts-ignore */}
              {typeof window !== 'undefined' && React.createElement(require('@/components/eva/EvaBriefingCard').default)}
            </div>
          </div>
        </div>

        <div className="bg-[#16213e] rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Deals Summary</h2>
          <div className="mt-4 space-y-2">
            {statusCounts.map(([status, count]) => (
              <div key={status} className="flex justify-between bg-[#0f2744] p-3 rounded">
                <span>{status}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full width Deadline Tracker */}
      <div className="mt-4">
        {/* @ts-ignore */}
        {typeof window !== 'undefined' && React.createElement(require('@/components/dashboard/DeadlineTracker').default)}
      </div>

    </div>
  )
}
