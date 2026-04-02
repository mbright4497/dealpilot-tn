import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendGHLEmail } from '@/lib/ghl/ghlClient'

type Alert = {
  severity: 'critical' | 'warning' | 'info'
  dealId: number
  address: string
  message: string
  action: string
}

async function buildRevaContext(supabase: any, userId: string) {
  const { data: deals } = await supabase.from('deal_state').select('id,address,current_state,binding_date,closing_date,created_at,documents').eq('user_id', userId)
  const { data: deadlines } = await supabase.from('deal_deadlines').select('deal_id,milestone_name,deadline_date,status').eq('user_id', userId)
  const { data: checklist } = await supabase.from('checklist_items').select('transaction_id,status').eq('user_id', userId)
  return { deals: deals || [], deadlines: deadlines || [], checklist: checklist || [] }
}

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('notification_prefs,notification_email,ghl_api_key').eq('id', user.id).single()
    const ctx = await buildRevaContext(supabase, user.id)
    const alerts: Alert[] = []
    const now = Date.now()

    const incompleteByDeal = new Map<number, number>()
    for (const item of ctx.checklist) {
      const key = Number(item.transaction_id || 0)
      if (!key) continue
      if ((item.status || '').toLowerCase() !== 'completed' && (item.status || '').toLowerCase() !== 'done') {
        incompleteByDeal.set(key, (incompleteByDeal.get(key) || 0) + 1)
      }
    }

    for (const deal of ctx.deals) {
      const dealId = Number(deal.id)
      const address = deal.address || 'Unknown address'
      const createdAt = new Date(deal.created_at || Date.now()).getTime()
      const closingTs = deal.closing_date ? new Date(deal.closing_date).getTime() : null
      const bindingMissing3d = !deal.binding_date && (now - createdAt) >= (3 * 24 * 60 * 60 * 1000)
      if (bindingMissing3d) {
        alerts.push({ severity: 'critical', dealId, address, message: 'This deal is active and still missing a binding date.', action: 'Set the binding date now to unlock reliable deadline tracking.' })
      }
      if (closingTs && closingTs - now <= 7 * 24 * 60 * 60 * 1000 && (incompleteByDeal.get(dealId) || 0) > 0) {
        alerts.push({ severity: 'critical', dealId, address, message: 'Closing is within 7 days and checklist items are still incomplete.', action: 'Open the deal checklist and clear critical tasks first.' })
      }
      const docs = Array.isArray(deal.documents) ? deal.documents : []
      if (docs.length === 0) {
        alerts.push({ severity: 'warning', dealId, address, message: 'No uploaded documents found for this deal.', action: 'Upload contract and core transaction docs.' })
      }
    }

    for (const d of ctx.deadlines) {
      const ts = new Date(d.deadline_date).getTime()
      const days = Math.floor((ts - now) / (24 * 60 * 60 * 1000))
      if (days < 0) alerts.push({ severity: 'critical', dealId: Number(d.deal_id), address: '', message: `${d.milestone_name || 'A deadline'} is overdue.`, action: 'Update or complete this deadline immediately.' })
      else if (days <= 3 && (profile?.notification_prefs?.overdue_email ?? true)) alerts.push({ severity: 'warning', dealId: Number(d.deal_id), address: '', message: `${d.milestone_name || 'A deadline'} is due within 3 days.`, action: 'Confirm status and send reminders today.' })
    }

    const critical = alerts.filter((a) => a.severity === 'critical')
    if ((profile?.notification_prefs?.overdue_email ?? true) && critical.length > 0 && profile?.notification_email && profile?.ghl_api_key) {
      await sendGHLEmail(
        profile.ghl_api_key,
        { email: profile.notification_email, name: 'User' },
        { email: 'alerts@dealpilot.local', name: 'Vera Alerts' },
        `Vera Critical Alerts (${critical.length})`,
        critical.map((a) => `- ${a.message} Action: ${a.action}`).join('\n')
      )
    }
    return NextResponse.json({ alerts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
