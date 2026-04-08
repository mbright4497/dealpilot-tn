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
          'id, address, status, client, type, closing_date, binding_date, purchase_price, contacts, earnest_money, earnest_money_confirmed, earnest_money_holder, earnest_money_days, inspection_period_days, loan_type, county, special_stipulations, contract_data'
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
        lines.push(`Loan type: ${deal.loan_type || 'NOT SET'}`)
        lines.push(`County: ${deal.county || 'NOT SET'}`)
        lines.push(
          `Earnest money: ${deal.earnest_money ? '$' + deal.earnest_money : 'NOT SET'}`
        )
        lines.push(`Earnest money holder: ${deal.earnest_money_holder || 'NOT SET'}`)
        lines.push(
          `Earnest money due: ${deal.earnest_money_days ? deal.earnest_money_days + ' days after binding' : 'NOT SET'}`
        )
        lines.push(
          `Earnest money confirmed: ${deal.earnest_money_confirmed ? 'YES ✅' : 'NO - NOT YET CONFIRMED'}`
        )
        lines.push(
          `Inspection period: ${deal.inspection_period_days || 'NOT SET'} days`
        )
        if (deal.binding_date && deal.inspection_period_days) {
          const inspEnd = new Date(deal.binding_date)
          inspEnd.setDate(inspEnd.getDate() + deal.inspection_period_days)
          lines.push(`Inspection period ends: ${inspEnd.toISOString().split('T')[0]}`)
        }
        if (deal.special_stipulations) {
          lines.push(`Special stipulations: ${deal.special_stipulations}`)
        }
      }

      try {
        const { data: commLogRows, error: commLogError } = await supabase
          .from('communication_log')
          .select('id, channel, recipient, subject, body, created_at, sent_at, status')
          .eq('deal_id', dealId)
          .order('created_at', { ascending: false })
          .limit(30)

        lines.push('')
        if (commLogError) {
          lines.push('COMMUNICATION LOG: (unable to load)')
        } else if (!commLogRows || commLogRows.length === 0) {
          lines.push('COMMUNICATION LOG: No messages logged for this deal yet.')
        } else {
          lines.push(`COMMUNICATION LOG (last ${commLogRows.length}, newest first):`)
          for (const row of commLogRows) {
            const when = String(row.sent_at || row.created_at || '')
            const ch = String(row.channel || 'unknown')
            const to = String(row.recipient || '?')
            const subj = row.subject ? String(row.subject).replace(/\s+/g, ' ').slice(0, 100) : ''
            const bodyPreview = row.body
              ? String(row.body).replace(/\s+/g, ' ').slice(0, 160)
              : ''
            const st = row.status != null ? String(row.status) : ''
            lines.push(
              `- ${ch} → ${to} | ${when}${subj ? ` | ${subj}` : ''}${bodyPreview ? ` | ${bodyPreview}` : ''}${st ? ` | ${st}` : ''}`
            )
          }
        }
      } catch {
        lines.push('')
        lines.push('COMMUNICATION LOG: (failed to load)')
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

      try {
        const { data: inspectorAssignments } = await supabase
          .from('transaction_inspectors')
          .select('*, inspectors(*)')
          .eq('transaction_id', dealId)

        if (inspectorAssignments && inspectorAssignments.length > 0) {
          lines.push('')
          lines.push('ASSIGNED INSPECTORS/SERVICE PROVIDERS:')
          for (const assignment of inspectorAssignments) {
            const ins = assignment.inspectors
            if (!ins) continue
            lines.push(
              `- ${ins.name} | ${ins.company || 'No company'} | ${ins.phone || 'No phone'} | Booking: ${ins.booking_method || 'call'} | Type: ${assignment.inspection_type || 'home'} | Status: ${assignment.status || 'pending'}`
            )
            if (assignment.scheduled_at) {
              lines.push(
                `  Scheduled: ${new Date(assignment.scheduled_at).toLocaleDateString()}`
              )
            }
            if (assignment.report_received) {
              lines.push(`  Report: RECEIVED ✅`)
            } else {
              lines.push(`  Report: NOT YET RECEIVED`)
            }
          }
        } else {
          lines.push('')
          lines.push('ASSIGNED INSPECTORS: None assigned yet')
        }
      } catch {
        // inspectors unavailable
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
          if (d.extracted_text && typeof d.extracted_text === 'string' && d.extracted_text.trim().length > 0) {
            const textSnippet = d.extracted_text.trim().slice(0, 1500)
            lines.push(`  DOCUMENT TEXT (first 1500 chars): ${textSnippet}`)
          }
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

  // ─── COMMUNICATION RULES ───
  lines.push('')
  lines.push('━━━ VERA COMMUNICATION RULES ━━━')
  lines.push('You are a professional transaction coordinator acting on behalf of the agent.')
  lines.push(
    'Always introduce yourself as: "Hi, I\'m Vera, transaction coordinator for [agent name] at [brokerage]."'
  )
  lines.push('Always open warmly and close professionally.')
  lines.push('')
  lines.push('COMMUNICATION CADENCE:')
  lines.push('- Communicate with all parties minimum 3x per week')
  lines.push('- Every message must reference something SPECIFIC to this deal — never generic')
  lines.push('- Never send the same message type twice to the same contact in the same week')
  lines.push('- Always check communication_log before sending to avoid duplicates')
  lines.push('')
  lines.push('CASH DEAL RULES (when loan_type is cash or financing_contingency_waived):')
  lines.push('- Proof of funds is URGENT — must be requested immediately on binding date')
  lines.push('- No lender communications needed')
  lines.push('- Earnest money still required — follow up with title company for wire instructions')
  lines.push('- Appraisal may still be required — check contract')
  lines.push('')
  lines.push('FINANCED DEAL RULES:')
  lines.push('- Day 0: Send executed contract to lender immediately')
  lines.push('- Day 1: Confirm loan application started, get lender contact info')
  lines.push('- Day 3: Confirm loan application submitted — alert agent if not confirmed')
  lines.push('- Day 5: Confirm proof of funds/appraisal ordered')
  lines.push('- Day 14: Confirm intent to proceed, hazard insurance, appraisal ordered')
  lines.push('')
  lines.push('EARNEST MONEY RULES:')
  lines.push('- Earnest money instructions come from the TITLE COMPANY — not the agent')
  lines.push('- Contact title company to send wire instructions directly to buyer')
  lines.push('- Follow up every 2 days until earnest_money_confirmed = true')
  lines.push('- Alert agent immediately if earnest not confirmed by deadline')
  lines.push('')
  lines.push('INSPECTION RULES:')
  lines.push('- Buyers may want to interview inspectors before hiring — always offer vendor list first')
  lines.push('- If buyer says "get whoever" — coordinate directly with inspector and sellers')
  lines.push('- Always be courteous to sellers — they may still be living in the home')
  lines.push('- Coordinate access with sellers before scheduling any inspection')
  lines.push('- Send vendor list to buyer immediately if no inspector assigned yet')
  lines.push('- Follow up on inspection scheduling every 2 days until confirmed')
  lines.push('')
  lines.push('TITLE COMPANY RULES:')
  lines.push('- Send executed contract to title company on binding date')
  lines.push('- Title company handles earnest money wire instructions')
  lines.push('- Follow up 7 days before closing to confirm closing prep')
  lines.push('- Wire fraud warning must be reinforced to buyers — never trust wiring instructions via email')
  lines.push('')
  lines.push('ESCALATE TO AGENT WHEN:')
  lines.push('- Earnest money not confirmed 1 day before deadline')
  lines.push('- Lender has not confirmed loan application by day 3')
  lines.push('- Inspection not scheduled within 3 days of binding date')
  lines.push('- Any party is unresponsive after 2 follow-up attempts')
  lines.push('- Any deadline is overdue')
  lines.push('- Any conflict or dispute between parties')
  lines.push('')
  lines.push('TONE RULES:')
  lines.push('- Professional and warm — always')
  lines.push('- Every message has a friendly greeting and a warm sign-off')
  lines.push('- Sign off as: "Warm regards, Vera | Transaction Coordinator for [agent name]"')
  lines.push('- Never sound robotic or generic — reference the actual property and people')
  lines.push('- The goal is for every party to feel like iHome genuinely cares about this deal')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return lines.join('\n')
}
