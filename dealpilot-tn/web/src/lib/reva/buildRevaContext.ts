export async function buildRevaContext(
  supabase: any,
  userId: string,
  dealId?: string | number
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
      .select('full_name, brokerage, state, user_type')
      .eq('id', userId)
      .single()

    if (profile) {
      lines.push(
        `COORDINATOR: ${profile.full_name || 'Unknown'} | ${profile.brokerage || 'Unknown Brokerage'} | ${profile.state || 'TN'}`
      )
    }
  } catch {
    lines.push('COORDINATOR: (profile unavailable)')
  }

  lines.push('')

  try {
    const { data: deals, error } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      lines.push('DEALS: (error loading deals)')
    } else if (!deals || deals.length === 0) {
      lines.push('DEALS: No active deals found for this user.')
    } else {
      lines.push(`ACTIVE PORTFOLIO: ${deals.length} deal(s)`)
      for (const deal of deals) {
        lines.push(
          `- ${deal.address || 'Unknown address'} | Status: ${deal.status || 'unknown'} | Closing: ${deal.closing_date || 'NOT SET'} | Client: ${deal.client_name || 'Unknown'}`
        )
      }
    }
  } catch {
    lines.push('DEALS: (failed to load)')
  }

  lines.push('')

  try {
    const { data: deadlines } = await supabase
      .from('deadlines')
      .select('*, deals(address)')
      .eq('deals.user_id', userId)
      .order('due_date', { ascending: true })
      .limit(10)

    if (deadlines && deadlines.length > 0) {
      const now = new Date()
      const overdue = deadlines.filter(
        (d: any) => new Date(d.due_date) < now && d.status !== 'completed'
      )
      const upcoming = deadlines.filter(
        (d: any) => new Date(d.due_date) >= now && d.status !== 'completed'
      )

      if (overdue.length > 0) {
        lines.push('OVERDUE DEADLINES:')
        for (const d of overdue) {
          const days = Math.floor(
            (now.getTime() - new Date(d.due_date).getTime()) / 86400000
          )
          lines.push(
            `- ${d.type} - ${d.deals?.address || 'Unknown'} - ${days} days overdue`
          )
        }
        lines.push('')
      }

      if (upcoming.length > 0) {
        lines.push('UPCOMING DEADLINES:')
        for (const d of upcoming) {
          const days = Math.floor(
            (new Date(d.due_date).getTime() - now.getTime()) / 86400000
          )
          lines.push(
            `- ${d.type} - ${d.deals?.address || 'Unknown'} - due in ${days} days`
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
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single()

      if (deal) {
        lines.push(`Address: ${deal.address}`)
        lines.push(`Status: ${deal.status}`)
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
