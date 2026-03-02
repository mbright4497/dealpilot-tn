'use client'
// Phase 8: Portfolio Intelligence Engine
import React, { useEffect, useState } from 'react'
import DailyBriefing from './DailyBriefing'
import type { Transaction as ChatTransaction } from '@/app/chat/page'

interface Props {
  transactions?: ChatTransaction[]
  onOpenDeal?: (txId: number) => void
  onViewChecklist?: (txId: number) => void
  onNavigate?: (view: string) => void
}

interface PortfolioHealth {
  portfolio_score: number
  total_deals: number
  summary: { healthy: number; attention: number; at_risk: number }
  closing_soon: number
  inspection_expiring: number
  overall_status: string
  deals: { deal_id: number; address: string; status: string; score: number; signals: { label: string; impact: string }[] }[]
}

const PROGRESS_MAP: Record<string, number> = { draft: 10, binding: 25, inspection_period: 45, post_inspection: 70, closed: 100 }
const STATE_COLORS: Record<string, string> = { draft: 'bg-gray-400', binding: 'bg-blue-500', inspection_period: 'bg-green-500', post_inspection: 'bg-yellow-500', closed: 'bg-gray-400' }
const BADGE_COLORS: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', binding: 'bg-blue-50 text-blue-700', inspection_period: 'bg-green-50 text-green-700', post_inspection: 'bg-yellow-50 text-yellow-700', closed: 'bg-gray-100 text-gray-600' }

function PortfolioStatusLine({ status }: { status: string | null }) {
  if (!status) return null
  const msg: Record<string, string> = { at_risk: 'Portfolio requires immediate review.', attention: 'Portfolio requires attention.', healthy: 'Portfolio is stable.' }
  const cls: Record<string, string> = { at_risk: 'text-red-700 bg-red-50 border-red-200', attention: 'text-yellow-700 bg-yellow-50 border-yellow-200', healthy: 'text-green-700 bg-green-50 border-green-200' }
  return (<div className={`rounded-lg border px-4 py-3 text-sm font-medium ${cls[status] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>{msg[status] || 'Portfolio status unknown.'}</div>)
}

function PortfolioHealthCard({ portfolio }: { portfolio: PortfolioHealth | null }) {
  if (!portfolio) return (<div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mb-3" /><div className="h-8 bg-gray-200 rounded w-1/3" /></div>)
  const sc = portfolio.portfolio_score >= 80 ? 'text-green-600' : portfolio.portfolio_score >= 60 ? 'text-yellow-600' : 'text-red-600'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Portfolio Health</h3>
        <span className={`text-lg font-semibold ${sc}`}>{portfolio.portfolio_score}/100</span>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />{portfolio.summary.healthy} healthy</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" />{portfolio.summary.attention} attention</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />{portfolio.summary.at_risk} at risk</span>
      </div>
      {portfolio.deals.filter(d => d.signals.length > 0).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {portfolio.deals.filter(d => d.signals.length > 0).map(d => (
            <div key={d.deal_id} className="text-xs">
              <span className="font-medium text-gray-700">{d.address}:</span>{' '}
              {d.signals.map((s, i) => (<span key={i} className={`inline-block px-1.5 py-0.5 rounded mr-1 ${s.impact === 'high' ? 'bg-red-100 text-red-700' : s.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{s.label}</span>))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionSummaryRow({ portfolio }: { portfolio: PortfolioHealth | null }) {
  const cards = [
    { label: 'At Risk', value: portfolio?.summary.at_risk ?? 0, color: 'border-red-300 bg-red-50', textColor: 'text-red-700', dotColor: 'bg-red-500' },
    { label: 'Needs Attention', value: portfolio?.summary.attention ?? 0, color: 'border-yellow-300 bg-yellow-50', textColor: 'text-yellow-700', dotColor: 'bg-yellow-500' },
    { label: 'Closing Soon', value: portfolio?.closing_soon ?? 0, color: 'border-blue-300 bg-blue-50', textColor: 'text-blue-700', dotColor: 'bg-blue-500' },
    { label: 'Inspection Expiring', value: portfolio?.inspection_expiring ?? 0, color: 'border-orange-300 bg-orange-50', textColor: 'text-orange-700', dotColor: 'bg-orange-500' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${card.dotColor}`} />
            <span className={`text-sm font-medium ${card.textColor}`}>{card.label}</span>
          </div>
          <p className={`text-3xl font-bold ${card.textColor}`}>{portfolio ? card.value : '--'}</p>
        </div>
      ))}
    </div>
  )
}

export default function TCDashboard({ transactions = [], onOpenDeal, onViewChecklist, onNavigate }: Props) {
  const [portfolio, setPortfolio] = useState<PortfolioHealth | null>(null)
  useEffect(() => {
    fetch('/api/portfolio-health').then(r => r.json()).then(data => { if (data.portfolio_score !== undefined) setPortfolio(data) }).catch(() => {})
  }, [])
  const upcomingDeadlines = transactions.flatMap(tx => {
    if (!tx.timeline) return []
    return tx.timeline.filter(ev => ev.status === 'upcoming' || ev.status === 'active').filter(ev => ev.date).map(ev => ({
      task: ev.label, deal: tx.address,
      date: ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      urgent: ev.status === 'active',
    }))
  }).slice(0, 6)
  return (
    <div className="space-y-6">
      <DailyBriefing userName="Matt" transactions={transactions as ChatTransaction[]} onNavigate={(dest) => onNavigate && onNavigate(dest)} onOpenDeal={(txId) => onOpenDeal && onOpenDeal(txId)} />
      <PortfolioStatusLine status={portfolio?.overall_status ?? null} />
      <PortfolioHealthCard portfolio={portfolio} />
      <ActionSummaryRow portfolio={portfolio} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div><h3 className="font-semibold text-gray-900">Active Transactions</h3><p className="text-sm text-gray-500">{transactions.length} deals in your pipeline</p></div>
            <button onClick={() => onNavigate && onNavigate('transactions')} className="text-sm text-orange-500 hover:text-orange-600 font-medium">View All</button>
          </div>
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => {
              const state = tx.current_state || 'draft'
              const progress = PROGRESS_MAP[state] || 10
              const colorClass = STATE_COLORS[state] || 'bg-gray-400'
              const badgeClass = BADGE_COLORS[state] || 'bg-gray-100 text-gray-600'
              return (
                <div key={tx.id} onClick={() => onOpenDeal && onOpenDeal(tx.id)} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${colorClass}`}>{tx.type === 'Buyer' ? 'B' : tx.type === 'Seller' ? 'S' : '?'}</div>
                      <div><p className="font-medium text-gray-900">{tx.address}</p><p className="text-sm text-gray-500">{tx.client} · {tx.type || 'Transaction'}</p></div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>{tx.state_label || 'Draft'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full transition-all ${colorClass}`} style={{ width: `${progress}%` }} /></div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{progress}% complete</span>
                  </div>
                  {tx.closing_date && (<p className="text-xs text-gray-400 mt-1.5">Closing: {tx.closing_date}</p>)}
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
              <button onClick={() => onNavigate && onNavigate('deadlines')} className="text-sm text-orange-500 hover:text-orange-600 font-medium">View All</button>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingDeadlines.length === 0 && (<div className="p-4 text-sm text-gray-400 text-center">No upcoming deadlines</div>)}
              {upcomingDeadlines.map((d, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${d.urgent ? 'bg-red-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{d.task}</p><p className="text-xs text-gray-500">{d.deal}</p></div>
                  <span className={`text-xs font-medium whitespace-nowrap ${d.urgent ? 'text-red-600' : 'text-gray-500'}`}>{d.date}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => onNavigate && onNavigate('transactions')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-orange-50 hover:text-orange-600 transition-colors text-sm font-medium text-gray-700">Start New Transaction</button>
              <button onClick={() => onNavigate && onNavigate('deadlines')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium text-gray-700">Calculate Deadlines</button>
              <button onClick={() => onNavigate && onNavigate('forms')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-green-50 hover:text-green-600 transition-colors text-sm font-medium text-gray-700">Fill RF401 Form</button>
              <button onClick={() => onNavigate && onNavigate('checklist')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-purple-50 hover:text-purple-600 transition-colors text-sm font-medium text-gray-700">View Checklists</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
