import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGHLSMS } from '@/lib/ghl/ghlClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Load all active transactions with deadlines
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, address, client, binding_date, closing_date, user_id, contacts')
    .in('status', ['active', 'under_contract', 'pending'])
    .neq('status', 'deleted')
    .not('binding_date', 'is', null)

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // Load all agents
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, phone, ghl_contact_id')

  const agentMap = new Map(agents?.map((a) => [a.id, a]) || [])

  const results: any[] = []

  for (const tx of transactions) {
    const bindingDate = new Date(tx.binding_date)
    const agent = agentMap.get(tx.user_id)
    if (!agent?.phone) continue

    // Calculate TN standard deadlines from binding date
    const deadlines = [
      {
        name: 'Earnest Money Due',
        date: addDays(bindingDate, 3),
        daysWarning: 1,
        partyRole: 'Buyer',
        message: (contact: string, addr: string) =>
          `Hi ${contact}, earnest money for ${addr} is due tomorrow. Please confirm with your agent. - Vera`
      },
      {
        name: 'Inspection Period End',
        date: addDays(bindingDate, 10),
        daysWarning: 2,
        partyRole: 'Buyer',
        message: (contact: string, addr: string) =>
          `Hi ${contact}, your inspection period for ${addr} ends in 2 days. Contact your agent if you have concerns. - Vera`
      },
      {
        name: 'Financing Contingency',
        date: addDays(bindingDate, 20),
        daysWarning: 3,
        partyRole: 'Buyer',
        message: (contact: string, addr: string) =>
          `Hi ${contact}, your financing contingency deadline for ${addr} is in 3 days. Please confirm loan status with your lender. - Vera`
      },
      {
        name: 'Closing Date',
        date: tx.closing_date ? new Date(tx.closing_date) : null,
        daysWarning: 3,
        partyRole: 'Buyer',
        message: (contact: string, addr: string) =>
          `Hi ${contact}, closing for ${addr} is in 3 days! Your agent will send final instructions soon. - Vera`
      },
    ]

    for (const deadline of deadlines) {
      if (!deadline.date) continue

      const daysUntil = Math.floor(
        (deadline.date.getTime() - today.getTime()) / 86400000
      )

      if (daysUntil !== deadline.daysWarning) continue

      // Check if we already sent this reminder today
      const { data: existing } = await supabase
        .from('transaction_activity')
        .select('id')
        .eq('transaction_id', tx.id)
        .eq('type', 'vera_deadline_reminder')
        .eq('title', deadline.name)
        .gte('created_at', today.toISOString())
        .limit(1)

      if (existing && existing.length > 0) continue

      // Find the relevant contact
      const contacts = tx.contacts || []
      const contact = contacts.find(
        (c: any) => c.role?.toLowerCase().includes(
          deadline.partyRole.toLowerCase()
        ) && !c.role?.toLowerCase().includes('agent')
      )

      // Text the contact if found
      if (contact?.phone) {
        const message = deadline.message(
          contact.name?.split(' ')[0] || 'there',
          tx.address
        )

        await sendGHLSMS(
          process.env.GHL_API_KEY || '',
          contact.phone,
          process.env.GHL_SMS_NUMBER || '',
          message,
          contact.ghl_contact_id || null,
          process.env.GHL_LOCATION_ID || '',
          null,
          { allowPhoneOnlyRecipient: !contact.ghl_contact_id }
        )

        console.log(`[deadlines] texted ${contact.name} for ${deadline.name} on ${tx.address}`)
      }

      // Notify agent
      const agentMessage = `📋 Vera reminder sent: ${deadline.name} for ${tx.address} (${tx.client}) is in ${deadline.daysWarning} day(s).`
      
      await sendGHLSMS(
        process.env.GHL_API_KEY || '',
        agent.phone,
        process.env.GHL_SMS_NUMBER || '',
        agentMessage,
        agent.ghl_contact_id || null,
        process.env.GHL_LOCATION_ID || '',
        null,
        { allowPhoneOnlyRecipient: !agent.ghl_contact_id }
      )

      // Log the action so we never double-send
      await supabase.from('transaction_activity').insert({
        transaction_id: tx.id,
        user_id: tx.user_id,
        type: 'vera_deadline_reminder',
        title: deadline.name,
        description: `Vera sent ${deadline.name} reminder to ${contact?.name || 'agent only'}`,
        created_at: new Date().toISOString()
      })

      results.push({
        transaction: tx.address,
        deadline: deadline.name,
        daysUntil,
        contactTexted: contact?.name || 'none',
        agentNotified: agent.full_name
      })
    }
  }

  return NextResponse.json({
    processed: transactions.length,
    reminders_sent: results.length,
    results
  })
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
