'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Bell, Info, Plug, UserCircle } from 'lucide-react'
import { US_STATE_OPTIONS } from '@/lib/reva/stateConfig'

const primaryBtn =
  'rounded-xl bg-[#F97316] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ea580c] disabled:opacity-60'
const secondaryBtn =
  'rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({})
  const [status, setStatus] = useState('')
  const [ghlStatus, setGhlStatus] = useState<'unknown' | 'connected' | 'not_connected'>('unknown')
  const [ghlMessage, setGhlMessage] = useState('')

  const prefs = useMemo(() => profile.notification_prefs || {}, [profile.notification_prefs])

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/profile')
      const json = await res.json()
      if (json?.profile) {
        setProfile({
          ...json.profile,
          state: json.profile.state || 'TN',
          user_type: json.profile.user_type || 'Agent',
          notification_email: json.profile.notification_email || json.profile.email || '',
        })
      }
    })()
  }, [])

  async function refreshProfile() {
    const res = await fetch('/api/profile')
    const json = await res.json()
    if (json?.profile) {
      setProfile({
        ...json.profile,
        state: json.profile.state || 'TN',
        user_type: json.profile.user_type || 'Agent',
        notification_email: json.profile.notification_email || json.profile.email || '',
      })
    }
  }

  async function saveProfile() {
    setStatus('Saving profile...')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: profile.full_name,
        phone: profile.phone,
        brokerage: profile.brokerage,
        license_number: profile.license_number,
        state: profile.state,
        user_type: profile.user_type,
      }),
    })
    setStatus(res.ok ? 'Profile saved' : 'Failed to save profile')
    if (res.ok) await refreshProfile()
  }

  async function saveGhlIntegration() {
    setStatus('Saving GHL integration...')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ghl_api_key: profile.ghl_api_key ?? null,
        ghl_location_id: profile.ghl_location_id ?? null,
      }),
    })
    try {
      if (res.ok && profile.ghl_api_key) localStorage.setItem('ghl_api_key', profile.ghl_api_key)
    } catch {}
    setStatus(res.ok ? 'GHL integration saved' : 'Failed to save GHL integration')
    if (res.ok) await refreshProfile()
  }

  async function saveNotifications() {
    setStatus('Saving notifications...')
    const res = await fetch('/api/profile/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_prefs: prefs, notification_email: profile.notification_email }),
    })
    setStatus(res.ok ? 'Notification preferences saved' : 'Failed to save notifications')
  }

  async function testConnection() {
    setGhlMessage('Testing...')
    const res = await fetch('/api/ghl/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ghl_api_key: profile.ghl_api_key || '', ghl_location_id: profile.ghl_location_id || '' }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.success === true) {
      setGhlStatus('connected')
      const label = json.location_name || json.accountName || json.locationName || 'GHL account'
      setGhlMessage(`Connected to ${label}`)
    } else {
      setGhlStatus('not_connected')
      setGhlMessage(typeof json.error === 'string' ? json.error : 'Connection failed — check your API key and Location ID')
    }
  }

  const ghlBadgeClass =
    ghlStatus === 'connected'
      ? 'border border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
      : 'border border-red-500/35 bg-red-500/15 text-red-200'

  return (
    <div className="min-h-screen bg-[#061021] p-6 text-white">
      <h1 className="text-2xl font-bold">Settings</h1>
      <a href="/chat" className="mt-2 inline-block text-sm text-gray-400 hover:text-white">← Back to Dashboard</a>
      {status && <div className="mt-3 text-sm text-emerald-300">{status}</div>}

      <section className="mt-6 rounded-xl border border-white/10 bg-[#0b1628] p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserCircle className="h-5 w-5 shrink-0 text-orange-400/90" aria-hidden />
          My Profile
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded bg-[#081224] p-2" placeholder="Full name" value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          <input className="rounded bg-[#081224] p-2 opacity-70" placeholder="Email" value={profile.email || ''} readOnly />
          <input className="rounded bg-[#081224] p-2" placeholder="Phone number" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <input className="rounded bg-[#081224] p-2" placeholder="Brokerage name" value={profile.brokerage || ''} onChange={(e) => setProfile({ ...profile, brokerage: e.target.value })} />
          <input className="rounded bg-[#081224] p-2" placeholder="License number" value={profile.license_number || ''} onChange={(e) => setProfile({ ...profile, license_number: e.target.value })} />
          <select className="rounded bg-[#081224] p-2" value={profile.state || 'TN'} onChange={(e) => setProfile({ ...profile, state: e.target.value })}>{US_STATE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          <select className="rounded bg-[#081224] p-2 md:col-span-2" value={profile.user_type || 'Agent'} onChange={(e) => setProfile({ ...profile, user_type: e.target.value })}>
            <option>Agent</option><option>Transaction Coordinator</option><option>Team TC</option>
          </select>
        </div>
        <button type="button" onClick={saveProfile} className={`mt-4 ${primaryBtn}`}>Save Profile</button>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-[#0b1628] p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Plug className="h-5 w-5 shrink-0 text-cyan-400/90" aria-hidden />
          GoHighLevel Integration
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input type="password" className="rounded bg-[#081224] p-2 md:col-span-2" placeholder="GHL API Key" value={profile.ghl_api_key || ''} onChange={(e) => setProfile({ ...profile, ghl_api_key: e.target.value })} />
          <input className="rounded bg-[#081224] p-2" placeholder="GHL Location ID (optional)" value={profile.ghl_location_id || ''} onChange={(e) => setProfile({ ...profile, ghl_location_id: e.target.value })} />
          <div className="flex items-center md:justify-end">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ghlBadgeClass}`}>
              {ghlStatus === 'connected' ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={testConnection} className={secondaryBtn}>Test Connection</button>
          <button type="button" onClick={saveGhlIntegration} className={primaryBtn}>Save</button>
          <button type="button" onClick={() => setProfile({ ...profile, ghl_api_key: '', ghl_location_id: '' })} className={secondaryBtn}>Clear</button>
        </div>
        {ghlMessage && <div className="mt-2 text-sm text-gray-300">{ghlMessage}</div>}
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-[#0b1628] p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5 shrink-0 text-amber-400/90" aria-hidden />
          Notifications
        </h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-[#081224]/60 p-3 transition-colors hover:border-white/10">
            <input type="checkbox" className="mt-0.5 shrink-0 rounded border-white/20" checked={prefs.overdue_email ?? true} onChange={(e) => setProfile({ ...profile, notification_prefs: { ...prefs, overdue_email: e.target.checked } })} />
            <span className="text-[15px] font-medium leading-snug text-white">Email me when a deadline is overdue</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-[#081224]/60 p-3 transition-colors hover:border-white/10">
            <input type="checkbox" className="mt-0.5 shrink-0 rounded border-white/20" checked={prefs.deadline_sms ?? false} onChange={(e) => setProfile({ ...profile, notification_prefs: { ...prefs, deadline_sms: e.target.checked } })} />
            <span className="text-[15px] font-medium leading-snug text-white">SMS me when a deadline is &lt; 3 days away</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-[#081224]/60 p-3 transition-colors hover:border-white/10">
            <input type="checkbox" className="mt-0.5 shrink-0 rounded border-white/20" checked={prefs.daily_briefing_email ?? true} onChange={(e) => setProfile({ ...profile, notification_prefs: { ...prefs, daily_briefing_email: e.target.checked } })} />
            <span className="text-[15px] font-medium leading-snug text-white">Daily briefing email at 7am</span>
          </label>
          <input className="w-full rounded bg-[#081224] p-2" placeholder="Notification email address" value={profile.notification_email || ''} onChange={(e) => setProfile({ ...profile, notification_email: e.target.value })} />
        </div>
        <button type="button" onClick={saveNotifications} className={`mt-4 ${primaryBtn}`}>Save Preferences</button>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-[#0b1628] p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5 shrink-0 text-orange-400/90" aria-hidden />
          Vera Auto-Send
        </h2>
        <p className="mt-2 text-sm text-slate-400">When enabled, Vera will automatically send scheduled communications without requiring your approval. When disabled, messages are queued for your review first.</p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/5 bg-[#081224]/60 p-4">
          <div>
            <div className="text-sm font-medium text-white">Auto-send communications</div>
            <div className="text-xs text-slate-400 mt-0.5">{profile.vera_auto_send ? 'Vera sends immediately — no approval needed' : 'Messages queue for your approval before sending'}</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const newVal = !profile.vera_auto_send
              setProfile({ ...profile, vera_auto_send: newVal })
              const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vera_auto_send: newVal }),
              })
              setStatus(res.ok ? (newVal ? 'Auto-send enabled' : 'Auto-send disabled — messages will queue for approval') : 'Failed to save')
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${profile.vera_auto_send ? 'bg-orange-500' : 'bg-slate-600'}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${profile.vera_auto_send ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-[#0b1628] p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Info className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
          About
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200">v0.1.0</span>
          <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200">Tennessee</span>
          <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200">Active</span>
        </div>
        <div className="mt-3 text-xs text-gray-400">More states coming soon</div>
      </section>
    </div>
  )
}
