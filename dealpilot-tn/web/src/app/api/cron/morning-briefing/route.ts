import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGHLSMS } from '@/lib/ghl/ghlClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const noStoreJsonHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
} as const

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreJsonHeaders }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email')
    .not('phone', 'is', null)

  console.log(
    '[cron] agents found:',
    agents?.length,
    agents?.map((a) => ({ name: a.full_name, phone: a.phone }))
  )

  if (!agents || agents.length === 0) {
    return NextResponse.json({ sent: 0 }, { headers: noStoreJsonHeaders })
  }

  const results: { agent: string | null; sent: boolean }[] = []

  for (const agent of agents) {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, address, client, phase, closing_date, binding_date, contacts')
        .eq('user_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(10)

      console.log(
        '[cron] transactions for',
        agent.full_name,
        ':',
        transactions?.length
      )

      if (!transactions || transactions.length === 0) continue

      const firstName = agent.full_name?.split(' ')[0] || 'there'

      const briefing = `Good morning ${firstName}! Reva here. You have ${transactions.length} active deal(s). Reply for details.`
      console.log('[cron] briefing text:', briefing.slice(0, 100))

      const smsResult = await sendGHLSMS(
        process.env.GHL_API_KEY || '',
        agent.phone!,
        process.env.GHL_SMS_NUMBER || '',
        briefing,
        null,
        process.env.GHL_LOCATION_ID || ''
      )
      console.log('[cron] SMS result:', JSON.stringify(smsResult))
      console.log('[cron] SMS sent to:', agent.phone)

      results.push({ agent: agent.full_name, sent: true })
    } catch (err) {
      console.error(`[cron] briefing failed for ${agent.full_name}:`, err)
      results.push({ agent: agent.full_name, sent: false })
    }
  }

  return NextResponse.json(
    {
      sent: results.filter((r) => r.sent).length,
      total: results.length,
      results,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
