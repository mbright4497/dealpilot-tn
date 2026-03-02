'use client'
// Phase 3: Live deal-state integration
import React from 'react'
import DailyBriefing from './DailyBriefing'
import type { Transaction as ChatTransaction } from '@/app/chat/page'

interface Props {
  transactions?: ChatTransaction[]
  onOpenDeal?: (txId: number) => void
  onViewChecklist?: (txId: number) => void
  onNavigate?: (view: string) => void
}

const PROGRESS_MAP: Record<string, number> = {
  draft: 10,
  binding: 25,
  inspection_period: 45,
  post_inspection: 70,
  closed: 100,
}

const STATE_COLORS: Record<string, string> = {
  draft: 'bg-gray-400',
  binding: 'bg-blue-500',
  inspection_period: 'bg-green-500',
  post_inspection: 'bg-yellow-500',
  closed: 'bg-gray-400',
}

const BADGE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  binding: 'bg-blue-50 text-blue-700',
  inspection_period: 'bg-green-50 text-green-700',
  post_inspection: 'bg-yellow-50 text-yellow-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function TCDashboard({ transactions = [], onOpenDeal, onViewChecklist, onNavigate }: Props) {
  const total = transactions.length
  const [portfolio, setPortfolio] = React.useState<any|null>(null)
  const activeCt = transactions.filter(t => t.current_state && t.current_state !== 'closed' && t.current_state !== 'draft').length
  const closedCt = transactions.filter(t => t.current_state === 'closed').length

  // fetch portfolio health
  React.useEffect(()=>{ let mounted = true; (async ()=>{ try{ const res = await fetch('/api/portfolio-health'); if(!mounted) return; if(res.ok){ const j = await res.json(); setPortfolio(j) } }catch(e){} })(); return ()=>{ mounted=false } },[])

  // Derive upcoming deadlines from timeline data
  const upcomingDeadlines = transactions.flatMap(tx => {
    if (!tx.timeline) return []
    return tx.timeline
      .filter(ev => ev.status === 'upcoming' || ev.status === 'active')
      .filter(ev => ev.date)
      .map(ev => ({
        task: ev.label,
        deal: tx.address,
        date: ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        urgent: ev.status === 'active',
      }))
  }).slice(0, 6)

  return (
    <div className="space-y-6">
      <DailyBriefing userName="Matt" transactions={transactions as ChatTransaction[]} onNavigate={(dest) => onNavigate && onNavigate(dest)} onOpenDeal={(txId) => onOpenDeal && onOpenDeal(txId)} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500 mt-1">Total Transactions</p>
        </div>

        {/* Portfolio Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${portfolio ? ( (portfolio.overall_status==='healthy') ? 'bg-green-500' : (portfolio.overall_status==='attention') ? 'bg-amber-500' : 'bg-red-500' ) : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">Portfolio Health</span>
            </div>
          </div>
          {/* STATUS label map */}
          {(() => {
            const STATUS_LABELS: Record<string,string> = { healthy: 'Healthy', attention: 'Needs Attention', at_risk: 'At Risk' }
            const label = portfolio ? (STATUS_LABELS[portfolio.overall_status] || portfolio.overall_status) : '—'
            return <p className="text-3xl font-bold text-gray-900">{label}</p>
          })()}
          <p className="text-sm text-gray-500 mt-1">Overall Status</p>
        </div>

        {/* Deal Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🧾</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{portfolio ? `${portfolio?.summary?.healthy ?? 0}/${portfolio?.summary?.attention ?? 0}/${portfolio?.summary?.at_risk ?? 0}` : '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Healthy / Attention / At Risk</p>
        </div>

        {/* Closing Soon */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{portfolio ? portfolio.closing_soon : '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Closing Soon</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Active Transactions</h3>
              <p className="text-sm text-gray-500">{total} deals in your pipeline</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('transactions')}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >View All →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => {
              const state = tx.current_state || 'draft'
              const progress = PROGRESS_MAP[state] || 10
              const colorClass = STATE_COLORS[state] || 'bg-gray-400'
              const badgeClass = BADGE_COLORS[state] || 'bg-gray-100 text-gray-600'
              return (
                <div
                  key={tx.id}
                  onClick={() => onOpenDeal && onOpenDeal(tx.id)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${colorClass}`}>
                        {tx.type === 'Buyer' ? 'B' : tx.type === 'Seller' ? 'S' : '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tx.address}</p>
                        <p className="text-sm text-gray-500">{tx.client} · {tx.type || 'Transaction'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>{tx.state_label || 'Draft'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${colorClass}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{progress}% complete</span>
                  </div>
                  {tx.closing_date && (
                    <p className="text-xs text-gray-400 mt-1.5">Closing: {tx.closing_date}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
              <button
                onClick={() => onNavigate && onNavigate('deadlines')}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >View All →</button>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingDeadlines.length === 0 && (
                <div className="p-4 text-sm text-gray-400 text-center">No upcoming deadlines</div>
              )}
              {upcomingDeadlines.map((d, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${d.urgent ? 'bg-red-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.task}</p>
                    <p className="text-xs text-gray-500">{d.deal}</p>
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${d.urgent ? 'text-red-600' : 'text-gray-500'}`}>{d.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate && onNavigate('transactions')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-orange-50 hover:text-orange-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>📝</span> Start New Transaction
              </button>
              <button
                onClick={() => onNavigate && onNavigate('deadlines')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>📅</span> Calculate Deadlines
              </button>
              <button
                onClick={() => onNavigate && onNavigate('forms')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-green-50 hover:text-green-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>📄</span> Fill RF401 Form
              </button>
              <button
                onClick={() => onNavigate && onNavigate('checklist')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-purple-50 hover:text-purple-600 transition-colors text-sm font-medium text-gray-700"
              >
                <span>✅</span> View Checklists
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
