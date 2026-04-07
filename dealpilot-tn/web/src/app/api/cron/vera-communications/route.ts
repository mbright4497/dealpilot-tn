import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

function daysDiff(dateStr: string | null, from: Date): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((d.getTime() - from.getTime()) / 86400000)
}

/** Days elapsed since a past date (positive = days ago) */
function daysSince(dateStr: string | null, from: Date): number | null {
  const d = daysDiff(dateStr, from)
  return d === null ? null : -d
}

type PlaybookRule = {
  key: string
  description: string
  shouldFire: (bindingDays: number | null, closingDays: number | null, inspectionDays: number | null) => boolean
  role: string
  type: 'email' | 'sms'
  subjectTemplate: string
  promptTemplate: string
}

const PLAYBOOK: PlaybookRule[] = [
  {
    key: 'welcome_buyer',
    description: 'Welcome buyer 1 day after binding',
    shouldFire: (b) => b === 1,
    role: 'buyer',
    type: 'email',
    subjectTemplate: 'Welcome! Your transaction is underway at {address}',
    promptTemplate: 'Draft a warm welcome email to the buyer at {address}. Let them know Vera is coordinating the transaction, key dates are being tracked, and they can reply with any questions. Binding date was {binding_date}. Closing is {closing_date}.',
  },
  {
    key: 'earnest_money_reminder',
    description: 'Earnest money reminder 3 days after binding',
    shouldFire: (b) => b === 3,
    role: 'buyer',
    type: 'email',
    subjectTemplate: 'Earnest Money Due Today — {address}',
    promptTemplate: 'Draft a reminder email to the buyer at {address} that earnest money is due today per the contract. Be friendly but clear about the deadline.',
  },
  {
    key: 'inspection_nudge',
    description: 'Inspection scheduling nudge 5 days after binding',
    shouldFire: (b) => b === 5,
    role: 'buyer',
    type: 'email',
    subjectTemplate: 'Schedule Your Inspection — {address}',
    promptTemplate: 'Draft an email to the buyer at {address} reminding them to schedule their home inspection. The inspection period ends around {inspection_end}. Encourage them to book as soon as possible.',
  },
  {
    key: 'title_intro',
    description: 'Title company intro email 2 days after binding',
    shouldFire: (b) => b === 2,
    role: 'title',
    type: 'email',
    subjectTemplate: 'New Transaction — {address}',
    promptTemplate: 'Draft a professional intro email to the title company for the property at {address}. Let them know we are under contract, binding date was {binding_date}, closing is {closing_date}, and ask them to begin the title search.',
  },
  {
    key: 'inspection_deadline_warning',
    description: 'Inspection period ends in 2 days',
    shouldFire: (b, c, i) => i === 2,
    role: 'buyer',
    type: 'sms',
    subjectTemplate: '',
    promptTemplate: 'Draft a brief SMS to the buyer at {address} warning them the inspection period ends in 2 days. Remind them to submit any repair requests before the deadline. Keep it under 160 characters.',
  },
  {
    key: 'financing_check',
    description: 'Financing contingency check 14 days before closing',
    shouldFire: (b, c) => c === 14,
    role: 'buyer',
    type: 'email',
    subjectTemplate: 'Financing Update Needed — {address}',
    promptTemplate: 'Draft an email to the buyer at {address} asking for a financing update. Closing is in 14 days on {closing_date}. Ask if their loan is on track and if they need anything from us.',
  },
  {
    key: 'walkthrough_reminder',
    description: 'Final walkthrough reminder 7 days before closing',
    shouldFire: (b, c) => c === 7,
    role: 'buyer',
    type: 'email',
    subjectTemplate: 'Schedule Final Walkthrough — {address}',
    promptTemplate: 'Draft an email to the buyer at {address} to schedule their final walkthrough. Closing is in 7 days on {closing_date}. The walkthrough should happen 1-2 days before closing.',
  },
  {
    key: 'wire_instructions',
    description: 'Wire instructions reminder 3 days before closing',
    shouldFire: (b, c) => c === 3,
    role: 'buyer',
    type: 'email',
    subjectTemplate: 'Wire Instructions & Closing Prep — {address}',
    promptTemplate: 'Draft an email to the buyer at {address} reminding them to confirm wire instructions with the title company before sending any funds. Warn about wire fraud. Closing is in 3 days on {closing_date}.',
  },
  {
    key: 'closing_day_reminder',
    description: 'Closing day reminder',
    shouldFire: (b, c) => c === 1,
    role: 'buyer',
    type: 'sms',
    subjectTemplate: '',
    promptTemplate: 'Draft a brief encouraging SMS to the buyer at {address}. Closing is tomorrow on {closing_date}. Remind them to bring ID and any remaining funds. Keep it under 160 characters.',
  },
]

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, vera_auto_send')

  if (!agents || agents.length === 0) {
    return NextResponse.json({ queued: 0 })
  }

  let totalQueued = 0

  console.log('[vera-cron] starting run', { agentCount: agents.length, now: now.toISOString() })

  for (const agent of agents) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, address, binding_date, closing_date, contacts, status')
      .eq('user_id', agent.id)
      .in('status', ['active', 'under_contract'])

    if (!transactions || transactions.length === 0) continue

    for (const tx of transactions) {
      const bindingDays = daysSince(tx.binding_date, now)
      const closingDays = daysDiff(tx.closing_date, now)

      console.log('[vera-cron] checking tx', { id: tx.id, address: tx.address, bindingDays, closingDays, contacts: (tx.contacts as any[])?.length })

      // Calculate inspection end (10 business days from binding — approximate as 14 calendar days)
      const inspectionEndStr = tx.binding_date
        ? new Date(new Date(tx.binding_date).getTime() + 14 * 86400000).toISOString()
        : null
      const inspectionDays = daysDiff(inspectionEndStr, now)

      for (const rule of PLAYBOOK) {
        console.log('[vera-cron] rule check', { key: rule.key, bindingDays, closingDays, inspectionDays })

        if (!rule.shouldFire(bindingDays, closingDays, inspectionDays)) continue

        // Find target contact
        const contacts = Array.isArray(tx.contacts) ? tx.contacts : []
        const contact = contacts.find((c: any) => {
          const r = c.role?.toLowerCase() || ''
          const target = rule.role.toLowerCase()
          return r === target || r.startsWith(target) || r.includes(target)
        })
        if (!contact) continue

        // Check not already queued/sent today
        const { data: existing } = await supabase
          .from('communication_log')
          .select('id')
          .eq('transaction_ref', tx.id)
          .eq('channel', rule.type)
          .ilike('body', `%${rule.key}%`)
          .gte('created_at', now.toISOString())
          .maybeSingle()

        if (existing) continue

        // Build prompt
        const prompt = rule.promptTemplate
          .replace(/{address}/g, tx.address || 'the property')
          .replace(/{binding_date}/g, tx.binding_date || 'unknown')
          .replace(/{closing_date}/g, tx.closing_date || 'unknown')
          .replace(/{inspection_end}/g, inspectionEndStr?.split('T')[0] || 'unknown')

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 400,
          messages: [
            {
              role: 'system',
              content: 'You are Vera, AI Transaction Coordinator for a Tennessee real estate agent. Draft professional, warm communications. Return ONLY the message body, no subject line, no preamble.',
            },
            { role: 'user', content: prompt },
          ],
        })

        const body = completion.choices[0].message.content || ''
        const subject = rule.subjectTemplate.replace(/{address}/g, tx.address || 'the property')
        const autoSend = agent.vera_auto_send === true

        // Insert into communication_log
        const { error: insertErr } = await supabase.from('communication_log').insert({
          transaction_ref: tx.id,
          channel: rule.type,
          contact_role: rule.role,
          contact_name: contact.name || '',
          contact_email: contact.email || null,
          contact_phone: contact.phone || null,
          subject: rule.type === 'email' ? subject : null,
          body: `[${rule.key}] ${body}`,
          status: autoSend ? 'sending' : 'pending_approval',
          is_automated: true,
          sent_at: autoSend ? new Date().toISOString() : null,
        })
        if (insertErr) {
          console.error('[vera-cron] communication_log insert failed:', insertErr.message, insertErr.details, insertErr.hint)
          continue
        }

        totalQueued++

        // If auto-send, fire immediately
        if (autoSend) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/communications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-reva-secret': process.env.REVA_INTERNAL_SECRET || '',
            },
            body: JSON.stringify({
              type: rule.type,
              dealId: tx.id,
              contactRole: rule.role,
              subject,
              message: body,
              triggeredByReva: true,
              userId: agent.id,
            }),
          })
        }

        console.log(`[vera-cron] queued ${rule.key} for ${tx.address} → ${contact.name} (${autoSend ? 'auto-sent' : 'pending approval'})`)
      }
    }
  }

  return NextResponse.json({ queued: totalQueued, timestamp: new Date().toISOString() })
}
