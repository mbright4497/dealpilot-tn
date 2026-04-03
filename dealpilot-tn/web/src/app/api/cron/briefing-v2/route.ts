import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { sendGHLSMS } from '@/lib/ghl/ghlClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const noStoreJsonHeaders = {
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
  'Cache-Control':
    'no-store, no-cache, must-revalidate, proxy-revalidate',
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
    .select('id, full_name, phone, email, ghl_contact_id')
    .not('phone', 'is', null)

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

      if (!transactions || transactions.length === 0) continue

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const firstName = agent.full_name?.split(' ')[0] || 'there'

      const dealSummary = transactions.map((t: any) => {
        const closing = t.closing_date ? new Date(t.closing_date) : null
        const daysToClose = closing
          ? Math.floor((closing.getTime() - now.getTime()) / 86400000)
          : null
        return `${t.address} | ${t.client} | ${
          daysToClose === null ? 'No closing date'
          : daysToClose < 0 ? `${Math.abs(daysToClose)} days OVERDUE`
          : `${daysToClose} days to close`
        } | Binding: ${t.binding_date || 'NOT SET'}`
      }).join('\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: `You are Vera, AI Transaction Coordinator.
Generate a morning SMS briefing for ${firstName}.
Today is ${today}.
Keep it under 160 characters.
Lead with the most urgent item.
Be specific — use addresses and numbers.
End with "Reply for details."`
          },
          {
            role: 'user',
            content: `Agent deals:\n${dealSummary}\nGenerate morning briefing SMS.`
          }
        ]
      })

      const briefing = completion.choices[0].message.content ||
        `Good morning ${firstName}! You have ${transactions.length} active deal(s). Reply for details.`

      const agentGhlId = agent.ghl_contact_id || null
      const smsResult = await sendGHLSMS(
        process.env.GHL_API_KEY || '',
        agent.phone!,
        process.env.GHL_SMS_NUMBER || '',
        briefing,
        agentGhlId,
        process.env.GHL_LOCATION_ID || '',
        null,
        { allowPhoneOnlyRecipient: !agentGhlId }
      )
      console.log('[cron] briefing sent to:', agent.full_name)

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
    { headers: noStoreJsonHeaders }
  )
}
