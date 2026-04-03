import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGHLSMS } from '@/lib/ghl/ghlClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function findBuyerContact(contacts: unknown): { firstName: string; phone: string } | null {
  const list = Array.isArray(contacts) ? contacts : []
  const buyer = list.find((c: { role?: string; name?: string; phone?: string }) => {
    const role = String(c?.role || '').toLowerCase()
    return role.includes('buyer') && !role.includes('agent')
  }) as { name?: string; phone?: string } | undefined
  if (buyer?.phone) {
    const first = String(buyer.name || 'Buyer').trim().split(/\s+/)[0] || 'Buyer'
    return { firstName: first, phone: buyer.phone }
  }
  return null
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
      'id, address, city, state, binding_date, earnest_money, earnest_money_holder, contacts, user_id, earnest_money_confirmed'
    )
    .in('status', ['active', 'under_contract', 'pending'])
    .neq('status', 'deleted')
    .not('binding_date', 'is', null)
    .not('earnest_money', 'is', null)

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ processed: 0, results: [] })
  }

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, phone, ghl_contact_id')

  const agentMap = new Map(agents?.map((a) => [a.id, a]) || [])

  const ghlKey = process.env.GHL_API_KEY || ''
  const ghlFrom = process.env.GHL_SMS_NUMBER || ''
  const ghlLoc = process.env.GHL_LOCATION_ID || ''

  const results: { tx: number; kind: string }[] = []

  for (const tx of transactions) {
    const agent = agentMap.get(tx.user_id as string)
    if (!agent?.phone) continue

    const bindingDate = startOfDay(new Date(tx.binding_date as string))
    const daysSinceBinding = calendarDaysBetween(bindingDate, today)

    const buyer = findBuyerContact(tx.contacts)
    const addrShort = String(tx.address || '').trim() || 'the property'
    const amount = Number(tx.earnest_money)
    if (!Number.isFinite(amount)) continue

    const amtStr = formatUsd(amount)
    const holder = String(tx.earnest_money_holder || '').trim() || 'the title company'
    const confirmed = tx.earnest_money_confirmed === true

    const sendToAgent = async (message: string, logTitle: string) => {
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
        activity_type: 'vera_earnest_reminder',
        title: logTitle,
        description: message.slice(0, 500),
        metadata: { kind: 'earnest_money' },
      })
    }

    // DAY 1 (binding + 1): reminder to buyer — due in 2 days
    if (daysSinceBinding === 1) {
      const logged = await alreadyLoggedToday(
        supabase,
        tx.id as number,
        'vera_earnest_reminder',
        'earnest_day1',
        todayStartIso
      )
      if (logged) continue

      const name = buyer?.firstName || 'there'
      const msg = `Hi ${name}! Just a reminder that your earnest money of ${amtStr} for ${addrShort} is due in 2 days to ${holder}. Please confirm with your agent. - Vera`
      if (buyer?.phone) {
        await sendGHLSMS(ghlKey, buyer.phone, ghlFrom, msg, null, ghlLoc, null, {
          allowPhoneOnlyRecipient: true,
        })
      }
      await supabase.from('transaction_activity').insert({
        transaction_id: tx.id,
        user_id: tx.user_id,
        activity_type: 'vera_earnest_reminder',
        title: 'earnest_day1',
        description: msg.slice(0, 500),
        metadata: { kind: 'earnest_money', to: buyer?.phone ? 'buyer' : 'none' },
      })
      results.push({ tx: tx.id as number, kind: 'earnest_day1' })
      continue
    }

    // DAY 3 = binding + 3: earnest due today — buyer + agent
    if (daysSinceBinding === 3) {
      const logged = await alreadyLoggedToday(
        supabase,
        tx.id as number,
        'vera_earnest_reminder',
        'earnest_due',
        todayStartIso
      )
      if (logged) continue

      const name = buyer?.firstName || 'there'
      const buyerMsg = `Hi ${name}! Your earnest money of ${amtStr} for ${addrShort} is due TODAY to ${holder}. Please confirm delivery with your agent immediately. - Vera`
      if (buyer?.phone) {
        await sendGHLSMS(ghlKey, buyer.phone, ghlFrom, buyerMsg, null, ghlLoc, null, {
          allowPhoneOnlyRecipient: true,
        })
      }

      const agentMsg = `⚠️ Earnest money due TODAY for ${addrShort}. Amount: ${amtStr}. Holder: ${holder}. Confirm receipt with title company.`
      await sendGHLSMS(
        ghlKey,
        agent.phone!,
        ghlFrom,
        agentMsg,
        agent.ghl_contact_id || null,
        ghlLoc,
        null,
        { allowPhoneOnlyRecipient: !agent.ghl_contact_id }
      )

      await supabase.from('transaction_activity').insert({
        transaction_id: tx.id,
        user_id: tx.user_id,
        activity_type: 'vera_earnest_reminder',
        title: 'earnest_due',
        description: `Due today: buyer texted ${buyer?.phone ? 'yes' : 'no phone'}`,
        metadata: { kind: 'earnest_money' },
      })
      results.push({ tx: tx.id as number, kind: 'earnest_due' })
      continue
    }

    // DAY 4 = one day after due: overdue — agent only if not confirmed
    if (daysSinceBinding === 4 && !confirmed) {
      const logged = await alreadyLoggedToday(
        supabase,
        tx.id as number,
        'vera_earnest_reminder',
        'earnest_overdue',
        todayStartIso
      )
      if (logged) continue

      const urgent = `🚨 OVERDUE: Earnest money not confirmed for ${addrShort}. Was due yesterday. Buyer may be in default. Take action now.`
      await sendToAgent(urgent, 'earnest_overdue')
      results.push({ tx: tx.id as number, kind: 'earnest_overdue' })
    }
  }

  return NextResponse.json({
    processed: transactions.length,
    reminders_sent: results.length,
    results,
  })
}
