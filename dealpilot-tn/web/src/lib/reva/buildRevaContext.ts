import { TN_DOCUMENT_CHECKLIST } from '@/lib/documents/tnDocumentChecklist'

export async function buildRevaContext(
  supabase: any,
  userId: string,
  dealId?: string | number,
  userEmail?: string
): Promise<string> {
  const lines: string[] = []
  const today = new Date().toISOString().split('T')[0]

  lines.push(`TODAY IS: ${today}`)
  lines.push(`When calculating dates, use ${today} as today.`)
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
      .neq('status', 'deleted')
      .order('id', { ascending: false })
    console.log('Transactions result:', JSON.stringify(deals))
    console.log('Transactions error:', JSON.stringify(error))

    if (error) {
      lines.push('DEALS: (error loading deals)')
    } else if (!deals || deals.length === 0) {
      lines.push('DEALS: No active deals found for this user.')
    } else {
      lines.push(`ACTIVE PORTFOLIO: ${deals.length} deal(s)`)
      const now = new Date()
      const totalRequired = TN_DOCUMENT_CHECKLIST.filter(
        (s) => s.requirement === 'required'
      ).length
      for (const deal of deals) {
        lines.push(
          `- ${deal.address || 'Unknown address'} | Status: ${deal.status || 'unknown'} | Closing: ${deal.closing_date || 'NOT SET'} | Client: ${deal.client || 'Unknown'}`
        )
        const closingDate = deal.closing_date ? new Date(deal.closing_date) : null
        if (closingDate && !isNaN(closingDate.getTime())) {
          const diffDays = Math.floor(
            (closingDate.getTime() - now.getTime()) / 86400000
          )
          if (diffDays < 0) {
            lines.push(
              `  ⚠️ OVERDUE: Closing was ${Math.abs(diffDays)} days ago!`
            )
          } else if (diffDays <= 7) {
            lines.push(`  🔴 URGENT: Closing in ${diffDays} days`)
          } else if (diffDays <= 30) {
            lines.push(`  🟡 Closing in ${diffDays} days`)
          }
        }
        if (!deal.binding_date) {
          lines.push(
            `  ⚠️ CRITICAL: No binding agreement date set — contract not enforceable`
          )
        }
      }
      lines.push('')
      lines.push('DOCUMENT COMPLIANCE (required uploads):')
      for (const deal of deals) {
        const { count: docCount } = await supabase
          .from('transaction_documents')
          .select('id', { count: 'exact', head: true })
          .eq('transaction_id', deal.id)
        lines.push(
          `- ${deal.address || 'Unknown address'}: ${docCount ?? 0}/${totalRequired} required docs uploaded`
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
      .neq('status', 'deleted')
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
        .select(
          'id, address, status, client, type, closing_date, binding_date, purchase_price, contacts'
        )
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

      const rawContacts = deal && (deal as { contacts?: unknown }).contacts
      const txContacts = Array.isArray(rawContacts)
        ? (rawContacts as Array<{
            id?: string
            name?: string
            role?: string
            email?: string | null
            phone?: string | null
            ghl_contact_id?: string | null
            ghlContactId?: string | null
          }>)
        : []

      if (txContacts.length > 0) {
        lines.push('Contacts:')
        for (const c of txContacts) {
          const id = c.id != null ? String(c.id) : 'UNKNOWN'
          const name = c.name != null ? String(c.name) : 'Unnamed'
          const role = c.role != null ? String(c.role) : ''
          const email = c.email != null && String(c.email).trim() !== '' ? String(c.email) : 'NO EMAIL'
          const phone = c.phone != null && String(c.phone).trim() !== '' ? String(c.phone) : 'NO PHONE'
          const ghlRaw =
            c.ghl_contact_id != null && String(c.ghl_contact_id).trim() !== ''
              ? String(c.ghl_contact_id).trim()
              : c.ghlContactId != null && String(c.ghlContactId).trim() !== ''
                ? String(c.ghlContactId).trim()
                : ''
          lines.push(`CONTACT ID: ${id}`)
          lines.push(
            `CONTACT: ${name} | Role: ${role} | Email: ${email} | Phone: ${phone}`
          )
          lines.push(`GHL CONTACT ID: ${ghlRaw || 'NOT SYNCED — SMS/email to this party will fail until synced'}`)
        }
      } else {
        lines.push('Contacts: None linked to this deal')
      }

      let docs: any[] = []
      const docsRes = await supabase
        .from('transaction_documents')
        .select('*')
        .eq('transaction_id', dealId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!docsRes.error && docsRes.data) {
        docs = docsRes.data
      }

      if (docs.length > 0) {
        lines.push('')
        lines.push(`TRANSACTION DOCUMENTS (${docs.length} total):`)
        for (const d of docs) {
          const ex = d.extracted_data
          const br = d.broker_review
          const di = d.deal_impact
          const exec = d.is_executed ? 'yes' : 'no'
          lines.push(
            `- ${d.display_name} | Type: ${d.document_type} | Status: ${d.status} | Executed: ${exec}`
          )
          if (ex && typeof ex === 'object') {
            if (ex.fields?.purchasePrice != null) {
              lines.push(`  Extracted: purchase price ${ex.fields.purchasePrice}`)
            }
            if (ex.new_purchase_price != null) {
              lines.push(`  Extracted: new purchase price ${ex.new_purchase_price}`)
            }
            if (ex.new_closing_date) {
              lines.push(`  Extracted: new closing ${ex.new_closing_date}`)
            }
          }
          if (br?.issues?.length) {
            lines.push(`  Broker review issues: ${br.issues.length}`)
          }
          if (di && typeof di === 'object' && Object.keys(di).length) {
            lines.push(`  Deal impact: ${JSON.stringify(di)}`)
          }
        }

        lines.push('')
        lines.push('MASTER DEAL TIMELINE (from all docs combined):')
        const psa = docs.find((x: any) => x.document_type === 'rf401_psa')
        const psaEx = psa?.extracted_data
        const basePrice =
          psaEx?.fields?.purchasePrice ?? deal?.purchase_price ?? 'unknown'
        const baseClose = psaEx?.fields?.closingDate ?? deal?.closing_date ?? 'unknown'
        lines.push(`Original PSA (baseline): price ${basePrice}, closing ${baseClose}`)
        for (const d of docs) {
          if (d.document_type === 'rf406_counter' && d.deal_impact) {
            lines.push(`Counter ${d.display_name}: ${JSON.stringify(d.deal_impact)}`)
          }
          if (d.document_type === 'rf407_amendment' && d.deal_impact) {
            lines.push(`Amendment ${d.display_name}: ${JSON.stringify(d.deal_impact)}`)
          }
        }
        lines.push(
          `Current (transaction row): price ${deal?.purchase_price ?? 'unknown'}, closing ${deal?.closing_date ?? 'unknown'}`
        )
      }

      const uploadedTypes = docs.map((d) => String(d.document_type || ''))
      const missingRequired = TN_DOCUMENT_CHECKLIST.filter(
        (slot) =>
          slot.requirement === 'required' &&
          !uploadedTypes.includes(slot.document_type)
      )
      lines.push('')
      lines.push('MISSING REQUIRED DOCUMENTS:')
      if (missingRequired.length === 0) {
        lines.push('- None')
      } else {
        missingRequired.forEach((slot) => {
          lines.push(`- ${slot.display_name} (${slot.phase})`)
        })
      }
    } catch {
      lines.push('(deal details unavailable)')
    }
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  return lines.join('\n')
}
