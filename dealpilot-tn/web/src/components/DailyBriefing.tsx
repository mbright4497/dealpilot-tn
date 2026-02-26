'use client'
import React, { useMemo, useState } from 'react'
import type { Transaction } from '@/app/chat/page'
import { getGreeting } from '@/lib/tone-engine'
import type { AssistantStyle } from '@/lib/assistant-personality'
import { speak, stopSpeaking, isSpeaking } from '@/lib/voice-engine'
import dynamic from 'next/dynamic'
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

type UrgencyLevel = 'green' | 'yellow' | 'red'

interface DailyBrief {
  greeting: string
  activeDeals: number
  criticalDeadlines: { label: string; date: string; address: string }[]
  pendingConfirmations: string[]
  upcomingClosings: { address: string; date: string; daysAway: number }[]
  riskAlerts: string[]
  recommendedAction: string
  urgencyLevel: UrgencyLevel
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

// Minimal Lottie animation objects (small, safe to inline)
const AVATAR_ANIMATION = { v: '5.7.1', fr: 30, ip: 0, op: 60, w: 120, h: 120, nm: 'avatar', layers: [{ ty: 4, nm: 'circle', ks: { o: { a: 0, k: 100 }, p: { a: 0, k: [60, 60] }, s: { a: 0, k: [100, 100] } }, shapes: [{ ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } }, { ty: 'fl', c: { a: 0, k: [0.96, 0.52, 0.14, 1] } }] }] }
const SPEAKING_ANIMATION = { v: '5.7.1', fr: 30, ip: 0, op: 30, w: 120, h: 120, nm: 'speaking', layers: [{ ty: 4, nm: 'circle', ks: { o: { a: 0, k: 100 }, p: { a: 0, k: [60, 60] }, s: { a: 1, k: [{ t: 0, s: [100, 100] }, { t: 10, s: [110, 110] }, { t: 20, s: [95, 95] }, { t: 30, s: [100, 100] }] } }, shapes: [{ ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } }, { ty: 'fl', c: { a: 0, k: [0.96, 0.52, 0.14, 1] } }] }] }

function generateBrief(userName: string, transactions: Transaction[], now = new Date()): DailyBrief {
  const tod = getTimeOfDay()
  const active = transactions.filter(t => t.status === 'Active')
  const pending = transactions.filter(t => t.status === 'Pending')
  const allOpen = [...active, ...pending]

  const criticalDeadlines: DailyBrief['criticalDeadlines'] = []
  const upcomingClosings: DailyBrief['upcomingClosings'] = []
  const riskAlerts: string[] = []
  const pendingConfirmations: string[] = []

  allOpen.forEach(tx => {
    const closingDate = new Date(tx.closing)
    const bindingDate = new Date(tx.binding)
    const daysToClose = daysBetween(now, closingDate)
    const daysToBinding = daysBetween(now, bindingDate)

    if (daysToClose <= 7 && daysToClose > 0) {
      upcomingClosings.push({ address: tx.address.split(',')[0], date: tx.closing, daysAway: daysToClose })
    }
    if (daysToClose <= 14 && tx.status === 'Pending') {
      riskAlerts.push(`${tx.address.split(',')[0]} closing in ${daysToClose} days but still Pending`)
    }
    if (daysToBinding <= 2 && daysToBinding >= 0) {
      criticalDeadlines.push({ label: 'Binding deadline', date: tx.binding, address: tx.address.split(',')[0] })
    }
    if (daysToClose <= 2 && daysToClose >= 0) {
      criticalDeadlines.push({ label: 'Closing deadline', date: tx.closing, address: tx.address.split(',')[0] })
    }
    if (tx.contacts.length < 3) {
      pendingConfirmations.push(`${tx.address.split(',')[0]} has incomplete contact roster`)
    }
  })

  let urgencyLevel: UrgencyLevel = 'green'
  if (riskAlerts.length > 0 || criticalDeadlines.length > 0) urgencyLevel = 'red'
  else if (pendingConfirmations.length > 0 || upcomingClosings.length > 0) urgencyLevel = 'yellow'

  let recommendedAction = ''
  if (criticalDeadlines.length > 0) {
    recommendedAction = `I recommend reviewing the ${criticalDeadlines[0].address} file first — ${criticalDeadlines[0].label} is ${criticalDeadlines[0].date}.`
  } else if (riskAlerts.length > 0) {
    recommendedAction = `We have ${riskAlerts.length} item${riskAlerts.length > 1 ? 's' : ''} that need${riskAlerts.length === 1 ? 's' : ''} attention. Would you like me to pull up the details?`
  } else if (upcomingClosings.length > 0) {
    recommendedAction = `You have ${upcomingClosings.length} closing${upcomingClosings.length > 1 ? 's' : ''} coming up this week. Would you like to review them?`
  } else {
    recommendedAction = "You're in good shape today. Nothing urgent. Would you like to review upcoming closings?"
  }

  const greeting = `Good ${tod}, ${userName}`

  return {
    greeting,
    activeDeals: active.length + pending.length,
    criticalDeadlines,
    pendingConfirmations,
    upcomingClosings,
    riskAlerts,
    recommendedAction,
    urgencyLevel,
  }
}

const URGENCY_STYLES: Record<UrgencyLevel, { bg: string; border: string; dot: string }> = {
  green: { bg: 'bg-green-900/20', border: 'border-green-700/40', dot: 'bg-green-400' },
  yellow: { bg: 'bg-yellow-900/20', border: 'border-yellow-700/40', dot: 'bg-yellow-400' },
  red: { bg: 'bg-red-900/20', border: 'border-red-700/40', dot: 'bg-red-400' },
}

interface Props {
  userName: string
  transactions: Transaction[]
  onNavigate: (dest: string) => void
  onOpenDeal?: (txId: number) => void
  style?: AssistantStyle
}

export default function DailyBriefing({ userName, transactions, onNavigate, onOpenDeal, style }: Props) {
  const brief = useMemo(() => generateBrief(userName, transactions), [userName, transactions])
  const urgStyle = URGENCY_STYLES[brief.urgencyLevel]
  const greeting = style ? getGreeting(style, userName) : brief.greeting

  const [speaking, setSpeaking] = useState(false)
  function handleListen(){
    if(speaking){ stopSpeaking(); setSpeaking(false); return }
    const fullText = `${greeting}. I'm tracking ${brief.activeDeals} active transactions for you today. ${brief.recommendedAction}`
    speak(fullText, style || 'friendly-tn' as any, ()=>setSpeaking(true), ()=>setSpeaking(false))
  }

  return (
    <div className="mb-6">
      <div className={`rounded-xl ${urgStyle.bg} border ${urgStyle.border} p-6`}>
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 cursor-pointer" onClick={handleListen} title={speaking ? 'Stop speaking' : 'Click to listen'}>
            <div style={{width:64,height:64}}>
              <Lottie animationData={speaking ? SPEAKING_ANIMATION : AVATAR_ANIMATION} loop={true} style={{width:64,height:64}} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <PilotAvatar size={56} />
            </div>
            {!speaking && <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1"><svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19 8a4 4 0 010 8" /></svg></div>}
          </div>
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl font-bold text-white">{greeting}</h1>
            <p className="text-gray-300 text-sm">
              I&apos;m tracking <span className="text-white font-semibold">{brief.activeDeals} active transaction{brief.activeDeals !== 1 ? 's' : ''}</span> for you today.
            </p>

            {brief.criticalDeadlines.length > 0 && (
              <div className="bg-red-900/30 rounded-lg p-3 border border-red-800/40">
                <p className="text-red-300 text-sm font-medium mb-1">Critical — within 48 hours:</p>
                {brief.criticalDeadlines.map((d, i) => (
                  <p key={i} className="text-red-200 text-sm">• {d.address}: {d.label} — {d.date}</p>
                ))}
              </div>
            )}

            {brief.riskAlerts.length > 0 && (
              <div className="space-y-1">
                <p className="text-yellow-300 text-sm font-medium">Risk alerts:</p>
                {brief.riskAlerts.map((r, i) => (
                  <p key={i} className="text-yellow-200 text-sm">• {r}</p>
                ))}
              </div>
            )}

            {brief.upcomingClosings.length > 0 && (
              <div className="space-y-1">
                <p className="text-gray-400 text-sm font-medium">Upcoming closings this week:</p>
                {brief.upcomingClosings.map((c, i) => (
                  <p key={i} className="text-gray-300 text-sm">• {c.address} — {c.date} ({c.daysAway} day{c.daysAway !== 1 ? 's' : ''} away)</p>
                ))}
              </div>
            )}

            <p className="text-gray-200 text-sm italic">{brief.recommendedAction}</p>

            <div className="flex flex-wrap gap-2 pt-2">
              {brief.criticalDeadlines.length > 0 && (
                <button onClick={() => onNavigate('transactions')} className="px-3 py-1.5 bg-red-600/80 text-white text-xs rounded-full hover:bg-red-600 transition">
                  Review Critical Files
                </button>
              )}
              <button onClick={() => onNavigate('transactions')} className="px-3 py-1.5 bg-gray-700 text-gray-200 text-xs rounded-full hover:bg-gray-600 transition">
                View All Transactions
              </button>
              <button onClick={() => onNavigate('deadlines')} className="px-3 py-1.5 bg-gray-700 text-gray-200 text-xs rounded-full hover:bg-gray-600 transition">
                Calculate Deadlines
              </button>
              <button onClick={() => onNavigate('ai')} className="px-3 py-1.5 bg-orange-600/80 text-white text-xs rounded-full hover:bg-orange-600 transition">
                Talk to Assistant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
