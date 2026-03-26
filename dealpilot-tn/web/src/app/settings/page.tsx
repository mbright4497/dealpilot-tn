'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { US_STATE_OPTIONS } from '@/lib/reva/stateConfig'

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
    try {
      const saved = localStorage.getItem('ghl_api_key')
      if (saved) setProfile((p:any) => ({ ...p, ghl_api_key: saved }))
    } catch {}
  }, [])

  async function saveProfile() {
    setStatus('Saving profile...')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    try {
      if (profile.ghl_api_key) localStorage.setItem('ghl_api_key', profile.ghl_api_key)
    } catch {}
    setStatus(res.ok ? 'Profile saved' : 'Failed to save profile')
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
    if (res.ok && (json.connected || json.ok)) {
      setGhlStatus('connected')
      setGhlMessage(`Connected to ${json.accountName || json.locationName || 'GHL account'}`)
    } else {
      setGhlStatus('not_connected')
      setGhlMessage('Connection failed — check your API key')
    }
  }

  return (
    <div className="min-h-screen bg-[#061021] p-6 text-white">
      <h1 className="text-2xl font-bold">Settings</h1>
      <a href="/chat" className="mt-2 inline-block text-sm text-gray-400 hover:text-white">← Back to Dashboard</a>
      {status && <div className="mt-3 text-sm text-emerald-300">{status}</div>}

      <section className="mt-6 rounded-lg border border-white/10 bg-[#0b1628] p-4">
        <h2 className="text-lg font-semibold">My Profile</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded bg-[#081224] p-2" placeholder="Full name" value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          <input className="rounded bg-[#081224] p-2 opacity-70" placeholder="Email" value={profile.email || ''} readOnly />
          <input className="rounded bg-[#081224] p-2" placeholder="Phone number" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <input className="rounded bg-[#081224] p-2" placeholder="Brokerage name" value={profile.brokerage || ''} onChange={(e) => setProfile({ ...profile, brokerage: e.target.value })} />
          <input className="rounded bg-[#081224] p-2" placeholder="License number" value={profile.license_number || ''} onChange={(e) => setProfile({ ...profile, license_number: e.target.value })} />
          <select className="rounded bg-[#081224] p-2" value={profile.state || 'TN'} onChange={(e) => setProfile({ ...profile, state: e.target.value })}>{US_STATE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          <select className="rounded bg-[#081224] p-2" value={profile.user_type || 'Agent'} onChange={(e) => setProfile({ ...profile, user_type: e.target.value })}>
            <option>Agent</option><option>Transaction Coordinator</option><option>Team TC</option>
          </select>
        </div>
        <button onClick={saveProfile} className="mt-4 rounded bg-emerald-500 px-4 py-2 text-black">Save Profile</button>
      </section>

      <section className="mt-6 rounded-lg border border-white/10 bg-[#0b1628] p-4">
        <h2 className="text-lg font-semibold">GoHighLevel Integration</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input type="password" className="rounded bg-[#081224] p-2 md:col-span-2" placeholder="GHL API Key" value={profile.ghl_api_key || ''} onChange={(e) => setProfile({ ...profile, ghl_api_key: e.target.value })} />
          <input className="rounded bg-[#081224] p-2" placeholder="GHL Location ID (optional)" value={profile.ghl_location_id || ''} onChange={(e) => setProfile({ ...profile, ghl_location_id: e.target.value })} />
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${ghlStatus === 'connected' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            {ghlStatus === 'connected' ? 'Connected' : 'Not connected'}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={testConnection} className="rounded bg-cyan-500 px-4 py-2 text-black">Test Connection</button>
          <button onClick={saveProfile} className="rounded bg-emerald-500 px-4 py-2 text-black">Save</button>
          <button onClick={() => setProfile({ ...profile, ghl_api_key: '', ghl_location_id: '' })} className="rounded bg-gray-700 px-4 py-2">Clear</button>
        </div>
        {ghlMessage && <div className="mt-2 text-sm text-gray-300">{ghlMessage}</div>}
      </section>

      <section className="mt-6 rounded-lg border border-white/10 bg-[#0b1628] p-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.overdue_email ?? true} onChange={(e) => setProfile({ ...profile, notification_prefs: { ...prefs, overdue_email: e.target.checked } })} /> Email me when a deadline is overdue</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.deadline_sms ?? false} onChange={(e) => setProfile({ ...profile, notification_prefs: { ...prefs, deadline_sms: e.target.checked } })} /> SMS me when a deadline is &lt; 3 days away</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.daily_briefing_email ?? true} onChange={(e) => setProfile({ ...profile, notification_prefs: { ...prefs, daily_briefing_email: e.target.checked } })} /> Daily briefing email at 7am</label>
          <input className="w-full rounded bg-[#081224] p-2" placeholder="Notification email address" value={profile.notification_email || ''} onChange={(e) => setProfile({ ...profile, notification_email: e.target.value })} />
        </div>
        <button onClick={saveNotifications} className="mt-4 rounded bg-emerald-500 px-4 py-2 text-black">Save Preferences</button>
      </section>

      <section className="mt-6 rounded-lg border border-white/10 bg-[#0b1628] p-4">
        <h2 className="text-lg font-semibold">About</h2>
        <div className="mt-2 text-sm text-gray-300">App version: 0.1.0</div>
        <div className="mt-1 text-sm">State: Tennessee <span className="rounded bg-emerald-600 px-2 py-0.5 text-xs">Active</span></div>
        <div className="mt-1 text-xs text-gray-400">More states coming soon</div>
      </section>
    </div>
  )
}
