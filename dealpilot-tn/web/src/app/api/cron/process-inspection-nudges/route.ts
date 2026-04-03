import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGHLSMS } from '@/lib/ghl/ghlClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type InspectorRow = {
  name: string | null
  company: string | null
  phone: string | null
  booking_method: string | null
}

type AssignmentRow = {
  id: string
  transaction_id: number
  status: string | null
  scheduled_at: string | null
  completed_at: string | null
  inspectors: InspectorRow | InspectorRow[] | null
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function calendarDaysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.floor((b - a) / 86400000)
}

function formatMd(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getInspectionEndDate(
  bindingDate: Date,
  inspectionEndIso: string | null | undefined,
  inspectionPeriodDays: number | null | undefined
): Date {
  if (inspectionEndIso) {
    const d = new Date(inspectionEndIso)
    if (!Number.isNaN(d.getTime())) return startOfDay(d)
  }
  const days = inspectionPeriodDays ?? 10
  return addDays(startOfDay(bindingDate), days)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function findBuyerContact(contacts: unknown): { firstName: string; phone: string } | null {
  const list = Array.isArray(contacts) ? contacts : []
  const buyer = list.find((c: any) => {
    const role = String(c?.role || '').toLowerCase()
    return role.includes('buyer') && !role.includes('agent')
  }) as { name?: string; phone?: string } | undefined
  if (buyer?.phone) {
    const first = String(buyer.name || 'Buyer').trim().split(/\s+/)[0] || 'Buyer'
    return { firstName: first, phone: buyer.phone }
  }
  return null
}

function propertyLine(tx: { address: string; city?: string | null; state?: string | null }): string {
  const city = String(tx.city || '').trim()
  const st = String(tx.state || '').trim()
  const tail = city && st ? `, ${city} ${st}` : city ? `, ${city}` : st ? `, ${st}` : ''
  return `${tx.address}${tail}`
}

function normalizeInspector(
  inspectors: AssignmentRow['inspectors']
): InspectorRow | null {
  if (!inspectors) return null
  const row = Array.isArray(inspectors) ? inspectors[0] : inspectors
  return row || null
}

async function alreadyLoggedToday(
  supabase: { from: (t: string) => any },
  transactionId: number,
  activityType: string,
  title: string,
  dayStartIso: string
): Promise<boolean> {
  const { data } = await supabase
    .from('transaction_activity')
    .select('id')
    .eq('transaction_id', transactionId)
    .eq('activity_type', activityType)
    .eq('title', title)
    .gte('created_at', dayStartIso)
    .limit(1)
  return Boolean(data && data.length > 0)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = startOfDay(new Date())
  const todayStartIso = today.toISOString()

  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      'id, address, city, state, client, binding_date, user_id, contacts, inspection_period_days, inspection_end_date'
    )
    .in('status', ['active', 'under_contract', 'pending'])
    .neq('status', 'deleted')
    .not('binding_date', 'is', null)

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ processed: 0, sent: [] })
  }

  const txIds = transactions.map((t) => t.id)

  const { data: assignmentRows } = await supabase
    .from('transaction_inspectors')
    .select(
      `
      id,
      transaction_id,
      status,
      scheduled_at,
      completed_at,
      created_at,
      inspectors (
        name,
        company,
        phone,
        booking_method
      )
    `
    )
    .in('transaction_id', txIds)
    .order('created_at', { ascending: true })

  const byTx = new Map<number, AssignmentRow[]>()
  for (const row of assignmentRows || []) {
    const tid = row.transaction_id as number
    const list = byTx.get(tid) || []
    list.push(row as AssignmentRow)
    byTx.set(tid, list)
  }

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, phone, ghl_contact_id')

  const agentMap = new Map(agents?.map((a) => [a.id, a]) || [])

  const ghlKey = process.env.GHL_API_KEY || ''
  const ghlFrom = process.env.GHL_SMS_NUMBER || ''
  const ghlLoc = process.env.GHL_LOCATION_ID || ''

  const results: any[] = []

  for (const tx of transactions) {
    const agent = agentMap.get(tx.user_id as string)
    if (!agent?.phone) continue

    const bindingDate = startOfDay(new Date(tx.binding_date as string))
    const daysSinceBinding = calendarDaysBetween(bindingDate, today)

    const assignments = byTx.get(tx.id as number) || []
    const first = assignments[0]
    const insp = first ? normalizeInspector(first.inspectors) : null

    const inspectionEnd = getInspectionEndDate(
      bindingDate,
      tx.inspection_end_date as string | null | undefined,
      tx.inspection_period_days as number | null | undefined
    )
    const isInspectionEndDay = calendarDaysBetween(today, inspectionEnd) === 0

    const buyer = findBuyerContact(tx.contacts)
    const addrShort = String(tx.address || '').trim() || 'the property'
    const propLine = propertyLine(tx as any)
    const agentName = String(agent.full_name || 'Agent').trim()
    const inspectionEndMd = formatMd(inspectionEnd)

    const sendToAgent = async (message: string, logTitle: string, activityType: string) => {
      await sendGHLSMS(
        ghlKey,
        agent.phone!,
        ghlFrom,
        message,
        agent.ghl_contact_id || null,
        ghlLoc,
        null,
        { allowPhoneOnlyRecipient: !agent.ghl_contact_id }
      )
      await supabase.from('transaction_activity').insert({
        transaction_id: tx.id,
        user_id: tx.user_id,
        activity_type: activityType,
        title: logTitle,
        description: message.slice(0, 500),
        metadata: { kind: 'inspection_nudge' },
      })
    }

    const sendToPhone = async (
      phone: string,
      message: string,
      ghlContactId: string | null | undefined,
      logTitle: string,
      activityType: string
    ) => {
      await sendGHLSMS(ghlKey, phone, ghlFrom, message, ghlContactId || null, ghlLoc, null, {
        allowPhoneOnlyRecipient: !ghlContactId,
      })
      await supabase.from('transaction_activity').insert({
        transaction_id: tx.id,
        user_id: tx.user_id,
        activity_type: activityType,
        title: logTitle,
        description: message.slice(0, 500),
        metadata: { kind: 'inspection_nudge' },
      })
    }

    // ── Day of inspection period end: URGENT to agent ──
    if (isInspectionEndDay) {
      const stillNeedsInspector =
        assignments.length === 0 ||
        assignments.some(
          (a) =>
            String(a.status || '').toLowerCase() === 'pending' && !a.completed_at
        )
      if (stillNeedsInspector) {
        const logged = await alreadyLoggedToday(
          supabase,
          tx.id as number,
          'vera_inspection_period_end',
          'inspection_period_end',
          todayStartIso
        )
        if (!logged) {
          const msg = `🚨 URGENT: Inspection period ends TODAY (${inspectionEndMd}) for ${addrShort}. Schedule or confirm inspection immediately. — Vera/Closing Jet`
          await sendToAgent(msg, 'inspection_period_end', 'vera_inspection_period_end')
          results.push({ tx: tx.id, kind: 'inspection_end_urgent' })
        }
      }
    }

    // ── Day 1 after binding ──
    if (daysSinceBinding === 1) {
      const logged = await alreadyLoggedToday(
        supabase,
        tx.id as number,
        'vera_inspection_day1',
        'inspection_day1',
        todayStartIso
      )
      if (logged) continue

      if (assignments.length === 0) {
        const msg = `⚠️ No inspector assigned for ${addrShort}. Inspection period ends ${inspectionEndMd}. Assign one at closingjet.com`
        await sendToAgent(msg, 'inspection_day1', 'vera_inspection_day1')
        results.push({ tx: tx.id, kind: 'day1_no_inspector' })
        continue
      }

      const booking = String(insp?.booking_method || 'call').toLowerCase()
      if (booking === 'text') {
        const inspPhone = String(insp?.phone || '').trim()
        const inspFirst = String(insp?.name || 'there').trim().split(/\s+/)[0] || 'there'
        const buyerLine = buyer
          ? `Please contact ${buyer.firstName} at ${buyer.phone}.`
          : 'Please contact the buyer for coordination.'
        if (!inspPhone) {
          const msg = `⚠️ Inspector ${insp?.name || 'assigned'} has booking via text but no phone on file for ${addrShort}. Add phone or schedule manually. — Vera`
          await sendToAgent(msg, 'inspection_day1', 'vera_inspection_day1')
          results.push({ tx: tx.id, kind: 'day1_inspector_no_phone' })
          continue
        }
        const msg = `Hi ${inspFirst}! ${agentName}'s buyer needs an inspection at ${propLine}. ${buyerLine} - Vera/Closing Jet`
        await sendToPhone(inspPhone, msg, null, 'inspection_day1', 'vera_inspection_day1')
        results.push({ tx: tx.id, kind: 'day1_text_inspector' })
        continue
      }

      const inspName = String(insp?.name || 'the inspector').trim()
      const company = String(insp?.company || '').trim()
      const label = company ? `${inspName} at ${company}` : inspName
      const inspPhone = String(insp?.phone || '').trim()
      const phoneBit = inspPhone ? inspPhone : '(phone not on file — look up in Closing Jet)'
      const msg = `📞 Please call ${label} to schedule inspection for ${addrShort}: ${phoneBit}`
      await sendToAgent(msg, 'inspection_day1', 'vera_inspection_day1')
      results.push({ tx: tx.id, kind: 'day1_call_agent' })
      continue
    }

    // ── Day 3 after binding: pending only, escalated ──
    if (daysSinceBinding === 3) {
      const pendingOrUnassigned =
        assignments.length === 0 ||
        assignments.some((a) => String(a.status || '').toLowerCase() === 'pending' && !a.completed_at)
      if (!pendingOrUnassigned) continue

      const logged = await alreadyLoggedToday(
        supabase,
        tx.id as number,
        'vera_inspection_day3',
        'inspection_day3',
        todayStartIso
      )
      if (logged) continue

      if (assignments.length === 0) {
        const msg = `⚠️ URGENT follow-up: Still no inspector for ${addrShort}. Inspection period ends ${inspectionEndMd}. Assign one today at closingjet.com — Vera`
        await sendToAgent(msg, 'inspection_day3', 'vera_inspection_day3')
        results.push({ tx: tx.id, kind: 'day3_no_inspector' })
        continue
      }

      const booking = String(insp?.booking_method || 'call').toLowerCase()
      if (booking === 'text') {
        const inspPhone = String(insp?.phone || '').trim()
        const inspFirst = String(insp?.name || 'there').trim().split(/\s+/)[0] || 'there'
        const buyerLine = buyer
          ? `Please contact ${buyer.firstName} at ${buyer.phone}.`
          : 'Please contact the buyer for coordination.'
        if (!inspPhone) {
          const msg = `⚠️ URGENT: Inspector ${insp?.name || ''} still needs scheduling for ${addrShort} — no phone on file. — Vera`
          await sendToAgent(msg, 'inspection_day3', 'vera_inspection_day3')
          results.push({ tx: tx.id, kind: 'day3_inspector_no_phone' })
          continue
        }
        const msg = `URGENT follow-up: ${agentName}'s buyer still needs an inspection at ${propLine}. ${buyerLine} — Vera/Closing Jet`
        await sendToPhone(inspPhone, msg, null, 'inspection_day3', 'vera_inspection_day3')
        results.push({ tx: tx.id, kind: 'day3_text_inspector' })
        continue
      }

      const inspName = String(insp?.name || 'the inspector').trim()
      const company = String(insp?.company || '').trim()
      const label = company ? `${inspName} at ${company}` : inspName
      const inspPhone = String(insp?.phone || '').trim()
      const phoneBit = inspPhone ? inspPhone : '(phone not on file)'
      const msg = `⚠️ URGENT: Still need inspection scheduled for ${addrShort}. Call ${label}: ${phoneBit} — Vera`
      await sendToAgent(msg, 'inspection_day3', 'vera_inspection_day3')
      results.push({ tx: tx.id, kind: 'day3_call_agent' })
    }
  }

  return NextResponse.json({
    processed: transactions.length,
    reminders_sent: results.length,
    results,
  })
}
