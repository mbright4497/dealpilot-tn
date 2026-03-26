export async function buildRevaContext(
  supabase: any,
  userId: string,
  dealId?: string | number,
  userEmail?: string
): Promise<string> {
  const lines: string[] = []
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  lines.push(`TODAY: ${today}`)
  lines.push('')

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, brokerage, state, user_type, assistant_style, email')
      .eq('id', userId)
      .single()

    if (profile) {
      const emailForName = profile.email || userEmail || ''
      const emailUsername = String(emailForName).split('@')[0]?.trim()
      const fallbackName = emailUsername || 'there'
      const fullName = profile.full_name || fallbackName
      const brokerage = profile.brokerage || 'Independent'
      const state = profile.state || 'TN'
      const assistantStyle = profile.assistant_style || 'friendly_tn'
      lines.push(
        `COORDINATOR: ${fullName} | ${brokerage} | ${state}`
      )
      lines.push(`ASSISTANT_STYLE: ${assistantStyle}`)
    } else {
      const emailUsername = String(userEmail || '')
        .split('@')[0]
        ?.trim()
      const fallbackName = emailUsername || 'there'
      lines.push(`COORDINATOR: ${fallbackName} | Independent | TN`)
    }
  } catch {
    const emailUsername = String(userEmail || '')
      .split('@')[0]
      ?.trim()
    const fallbackName = emailUsername || 'there'
    lines.push(`COORDINATOR: ${fallbackName} | Independent | TN`)
  }

  lines.push('')

  try {
    console.log('Fetching transactions for userId:', userId)
    const { data: deals, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false })
    console.log('Transactions result:', JSON.stringify(deals))
    console.log('Transactions error:', JSON.stringify(error))

    if (error) {
      lines.push('DEALS: (error loading deals)')
    } else if (!deals || deals.length === 0) {
      lines.push('DEALS: No active deals found for this user.')
    } else {
      lines.push(`ACTIVE PORTFOLIO: ${deals.length} deal(s)`)
      for (const deal of deals) {
        lines.push(
          `- ${deal.address || 'Unknown address'} | Status: ${deal.status || 'unknown'} | Closing: ${deal.closing_date || 'NOT SET'} | Client: ${deal.client || 'Unknown'}`
        )
      }
    }
  } catch {
    lines.push('DEALS: (failed to load)')
  }

  lines.push('')

  try {
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, address, user_id')
      .eq('user_id', userId)
      .order('id', { ascending: false })

    if (txError || !transactions || transactions.length === 0) {
      throw new Error('transactions unavailable for deadline lookup')
    }

    const txIds = transactions.map((t: any) => t.id)
    const txAddressById = new Map(transactions.map((t: any) => [String(t.id), t.address]))

    let deadlines: any[] | null = null
    const byTransaction = await supabase
      .from('deadlines')
      .select('*')
      .in('transaction_id', txIds)
      .order('due_at', { ascending: true })
      .limit(10)

    if (!byTransaction.error) {
      deadlines = byTransaction.data
    } else {
      const byDeal = await supabase
        .from('deadlines')
        .select('*')
        .in('deal_id', txIds)
        .order('due_at', { ascending: true })
        .limit(10)
      if (byDeal.error) throw byDeal.error
      deadlines = byDeal.data
    }

    if (deadlines && deadlines.length > 0) {
      const now = new Date()
      const overdue = deadlines.filter(
        (d: any) => new Date(d.due_at || d.due_date) < now && d.status !== 'completed'
      )
      const upcoming = deadlines.filter(
        (d: any) => new Date(d.due_at || d.due_date) >= now && d.status !== 'completed'
      )

      if (overdue.length > 0) {
        lines.push('OVERDUE DEADLINES:')
        for (const d of overdue) {
          const relatedId = d.transaction_id ?? d.deal_id
          const address = txAddressById.get(String(relatedId)) || 'Unknown'
          const days = Math.floor(
            (now.getTime() - new Date(d.due_at || d.due_date).getTime()) / 86400000
          )
          lines.push(
            `- ${d.type || d.label || 'Deadline'} - ${address} - ${days} days overdue`
          )
        }
        lines.push('')
      }

      if (upcoming.length > 0) {
        lines.push('UPCOMING DEADLINES:')
        for (const d of upcoming) {
          const relatedId = d.transaction_id ?? d.deal_id
          const address = txAddressById.get(String(relatedId)) || 'Unknown'
          const days = Math.floor(
            (new Date(d.due_at || d.due_date).getTime() - now.getTime()) / 86400000
          )
          lines.push(
            `- ${d.type || d.label || 'Deadline'} - ${address} - due in ${days} days`
          )
        }
      }
    }
  } catch {
    // deadlines unavailable, skip
  }

  if (dealId) {
    lines.push('')
    lines.push('━━━ CURRENT DEAL FOCUS ━━━')
    try {
      const { data: deal } = await supabase
        .from('transactions')
        .select('id, address, status, client, type, closing_date, binding_date, purchase_price')
        .eq('id', dealId)
        .single()

      if (deal) {
        lines.push(`Address: ${deal.address}`)
        lines.push(`Status: ${deal.status}`)
        lines.push(`Client: ${deal.client || 'Unknown'}`)
        lines.push(`Binding date: ${deal.binding_date || 'NOT SET - CRITICAL'}`)
        lines.push(`Closing date: ${deal.closing_date || 'NOT SET'}`)
        lines.push(`Purchase price: ${deal.purchase_price || 'not extracted yet'}`)
      }

      const { data: contacts } = await supabase
        .from('deal_contacts')
        .select('*')
        .eq('deal_id', dealId)

      if (contacts && contacts.length > 0) {
        lines.push('Contacts:')
        for (const c of contacts) {
          lines.push(
            `- ${c.name} (${c.role}) | ${c.email || 'NO EMAIL'} | ${c.phone || 'NO PHONE'}`
          )
        }
      } else {
        lines.push('Contacts: None linked to this deal')
      }
    } catch {
      lines.push('(deal details unavailable)')
    }
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  return lines.join('\n')
}
