'use client'
// Phase 11: Deterministic Deadline Layer
import React from 'react'
import GhlWidget from './GhlWidget'
import { createBrowserClient } from '@/lib/supabase-browser'
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
export default function TCDashboard({ transactions = [], onOpenDeal, onViewChecklist, onNavigate, userName: userNameProp }: Props & { userName?: string }) {
  const total = transactions.length
  const [portfolio, setPortfolio] = React.useState<any|null>(null)
  const [portfolioDeadlines, setPortfolioDeadlines] = React.useState<any|null>(null)
  const [portfolioBrief, setPortfolioBrief] = React.useState<string | null>(null);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [notifPrefs, setNotifPrefs] = React.useState<any>(null);
  const [userName, setUserName] = React.useState<string>(userNameProp || '')
  const [followUps, setFollowUps] = React.useState<number>(0)

  React.useEffect(()=>{
    if (userNameProp) return
    const sb = createBrowserClient()
    sb.auth.getUser().then(res=>{ const user = res.data.user; if(user){ const full = (user.user_metadata as any)?.full_name || user.email || ''; setUserName(full.split(' ')[0] || '') } })
  },[userNameProp])

  // fetch comms badge data to compute follow-ups
  React.useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/transactions/comms-badge')
        if(!res.ok) return
        const j = await res.json()
        const map: Record<string, any> = {}
        if(Array.isArray(j.result)){
          for(const row of j.result){ map[String(row.transaction_id)] = row }
        }
        // expose globally for other components
        ;(window as any).__commsByTx = map
        if(!mounted) return
        const count = Object.values(map).filter((r:any)=>r.overdue).length
        setFollowUps(count)
      }catch(e){ console.error('Failed fetching comms-badge',e) }
    })()
    return ()=>{ mounted=false }
  },[transactions])
  // fetch portfolio health
  React.useEffect(()=>{ let mounted = true; (async ()=>{ try{ const res = await fetch('/api/portfolio-health'); if(!mounted) return; if(res.ok){ const j = await res.json(); setPortfolio(j) } }catch(e){} })(); return ()=>{ mounted=false } },[])
  // fetch portfolio deadlines
  React.useEffect(()=>{ let mounted = true; (async ()=>{ try{ const res = await fetch('/api/portfolio-deadlines'); if(!mounted) return; if(res.ok){ const j = await res.json(); setPortfolioDeadlines(j) } }catch(e){} })(); return ()=>{ mounted=false } },[])
  // fetch portfolio brief and proactive alerts
  React.useEffect(()=>{ let mounted = true; (async ()=>{ try{ fetch("/api/portfolio-brief").then(res=>res.json()).then(data=>{ if(!mounted) return; setPortfolioBrief(data.summary) }).catch(()=>{}); fetch("/api/portfolio-alerts").then(res=>res.json()).then(data=>{ if(!mounted) return; setAlerts(data.alerts ?? []) }).catch(()=>{}); // fetch notification preferences
    fetch('/api/notification-preferences').then(r=>r.json()).then(d=>{ if(!mounted) return; setNotifPrefs(d.prefs) }).catch(()=>{});
  }catch(e){} })(); return ()=>{ mounted=false } },[])
  const upcomingDeadlines: any[] = portfolioDeadlines ? [
    ...( (portfolioDeadlines.next_7_days && portfolioDeadlines.next_7_days.length > 0) ? portfolioDeadlines.next_7_days : (portfolioDeadlines.all_deadlines || []).filter((d: any) => d.status === 'upcoming' || d.status === 'overdue' || d.status === 'today') ).slice(0, 6)
  ] : []
  const overdueCount = portfolioDeadlines?.overdue_count || 0
  // compute Eva briefing
  const activeDeals = transactions.filter(t=> { const s = (t.current_state || t.status || '').toLowerCase(); return s !== 'closed' && s !== 'cancelled' })
  const activeCount = activeDeals.length
  // next closing deal (consider active deals)
  const withClosing = activeDeals.filter(t=> t.closing_date || t.closing)
  const nextClosing = withClosing.map(t=>({ tx: t, date: new Date(t.closing_date || t.closing) })).sort((a,b)=>a.date.getTime()-b.date.getTime())[0]
  // documents needed heuristic: active tx with no binding or no purchase_price
  const docsNeeded = activeDeals.filter(t=> !t.binding || (!((t as any).purchase_price) ) ).length
  // time-aware greeting for evaBrief (America/New_York)
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })
  const hh = parseInt(formatter.format(new Date()), 10) || 12
  let greeting = 'Good afternoon'
  if(hh >= 5 && hh <= 11) greeting = 'Good morning'
  else if(hh >= 18) greeting = 'Good evening'
  else if(hh <= 4) greeting = 'Hey there'
  const evaBrief = `${greeting}, ${userName || 'there'}. You have ${activeCount} active deals. ${ nextClosing ? `${String(nextClosing.tx.address||'').replace(/\}/g,'')} closes in ${Math.max(0, Math.ceil((nextClosing.date.getTime()-Date.now())/(1000*60*60*24)))} days — ${ (nextClosing.tx.binding ? 'on track' : 'missing binding') }.` : 'No upcoming closings.' }`

  return (
    <div className="space-y-6">
      {/* EVA Briefing (computed) */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4">
        <div className="text-sm text-blue-200 font-semibold">EVA Briefing</div>
        <div className="mt-2 text-white">{evaBrief}</div>
      </div>

      {/* Stats Row: Active Deals / Next Closing / Documents Needed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeCount}</p>
          <p className="text-sm text-cyan-300/70 mt-1">Active Deals</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📅</span>
          </div>
          {nextClosing ? (
            <>
              <p className="text-3xl font-bold text-white">{String(nextClosing.tx.address||'').replace(/\}/g,'')}</p>
              <p className="text-sm text-cyan-300/70 mt-1">{Math.max(0, Math.ceil((nextClosing.date.getTime()-Date.now())/(1000*60*60*24)))} days</p>
            </>
          ) : (
            <p className="text-3xl font-bold text-white">—</p>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🧾</span>
          </div>
          <p className="text-3xl font-bold text-white">{docsNeeded}</p>
          <p className="text-sm text-cyan-300/70 mt-1">Documents Needed</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EVA Daily Briefing */}
        {portfolioBrief && (
          <div className="mb-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm font-semibold text-blue-200">EVA Daily Briefing</p>
            <p className="mt-1 text-sm text-white">{portfolioBrief}</p>
          </div>
        )}
        {/* Proactive Alerts */}
        {alerts.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-200">⚠️ Action Required</p>
            <ul className="mt-2 space-y-1 text-sm">
              {alerts.map((a: any, i: number) => (
                <li key={i}>{a.message}</li>
              ))}
            </ul>
          </div>
        )}
        {/* Active Transactions */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <div>
              <h3 className="font-semibold text-white">Active Transactions</h3>
              <p className="text-sm text-gray-400">{total} deals in your pipeline</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('transactions')}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >View All →</button>
          </div>
          <div className="divide-y divide-white/5">
            {activeDeals.map(tx => {
              const state = tx.current_state || 'draft'
              const progress = PROGRESS_MAP[state] || 10
              const colorClass = STATE_COLORS[state] || 'bg-gray-400'
              const badgeClass = BADGE_COLORS[state] || 'bg-gray-100 text-gray-600'
              return (
                <div
                  key={tx.id}
                  onClick={() => onOpenDeal && onOpenDeal(tx.id)}
                  className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${colorClass}`}>
                        {tx.type === 'Buyer' ? 'B' : tx.type === 'Seller' ? 'S' : '?'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{tx.address}</p>
                        <p className="text-sm text-gray-400">{tx.client} · {tx.type || 'Transaction'}</p>
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
          {/* Upcoming Deadlines - Live from portfolio-deadlines API */}
          <div className=" bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">Upcoming Deadlines</h3>
                {overdueCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{overdueCount} overdue</span>
                )}
              </div>
              <button
                onClick={() => onNavigate && onNavigate('deadlines')}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >View All →</button>
            </div>
            <div className="divide-y divide-white/5">
              {upcomingDeadlines.length === 0 && (
                <div className="p-4 text-sm text-cyan-300/70 text-center">
                  {portfolioDeadlines ? 'No deadlines in next 7 days' : 'Loading...'}
                </div>
              )}
              {upcomingDeadlines.map((d: any, i: number) => {
                const isOverdue = d.status === 'overdue'
                const isToday = d.status === 'today'
                const isWarning = !isOverdue && !isToday && d.days_remaining <= 3
                const dotColor = isOverdue || isToday ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
                const dateColor = isOverdue || isToday ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-500'
                return (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{d.label}</p>
                      <p className="text-xs text-gray-500">{d.address}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium whitespace-nowrap ${dateColor}`}>
                        {isOverdue ? `${Math.abs(d.days_remaining)}d overdue` : isToday ? 'Today' : `${d.days_remaining}d`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Quick Actions */}
          <div className=" bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
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
              <button onClick={async () => { const mlsNumber = prompt('Enter MLS Number'); if (!mlsNumber) return; try { await fetch('/api/import/mls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mlsNumber }) }); window.location.reload(); } catch (e) { console.error(e); } }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-sm font-medium text-gray-700" >
                <span>🏠</span> Import from MLS </button>
            </div>
          </div>

          <GhlWidget />

          {/* Notification Settings */}
          <div className=" bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5">
            <h3 className="font-semibold text-white mb-3">Notification Settings</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <label className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <div className="font-medium">Email Alerts</div>
                  <div className="text-xs text-gray-500">Receive alert emails</div>
                </div>
                <input type="checkbox" checked={!!notifPrefs?.email_enabled} onChange={async (e)=>{ const next = !!e.target.checked; setNotifPrefs((p:any)=>({...p, email_enabled: next})); try{ await fetch('/api/notification-preferences',{ method:'PUT', body: JSON.stringify({...notifPrefs, email_enabled: next}), headers: {'Content-Type':'application/json'} }) }catch(e){} }} className="h-5 w-5" />
              </label>

              <label className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <div className="font-medium">SMS Alerts</div>
                  <div className="text-xs text-gray-500">Receive SMS for high severity</div>
                </div>
                <input type="checkbox" checked={!!notifPrefs?.sms_enabled} onChange={async (e)=>{ const next = !!e.target.checked; setNotifPrefs((p:any)=>({...p, sms_enabled: next})); try{ await fetch('/api/notification-preferences',{ method:'PUT', body: JSON.stringify({...notifPrefs, sms_enabled: next}), headers: {'Content-Type':'application/json'} }) }catch(e){} }} className="h-5 w-5" />
              </label>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
