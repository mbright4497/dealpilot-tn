import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'
import { createTransactionWithSetup } from '@/lib/transactions/service'

export const maxDuration = 60
const driveModeKeywords = [
  'start a transaction',
  'new transaction',
  'start a deal',
  'i am driving',
  "i'm driving",
  'drive mode',
  'start a purchase',
  'start a psa',
  'purchase and sale',
  'new psa',
  'add a transaction',
  'create a transaction',
  'hey reva start',
  'lets start a deal',
  "let's start a deal",
]
const styleInstructions: Record<string, string> = {
  joyful: 'Communicate in an upbeat, energetic, encouraging tone. Use enthusiasm.',
  straight: 'Communicate in a concise, no-frills, direct tone. No fluff.',
  calm: 'Communicate in a measured, reassuring, professional tone.',
  executive: 'Communicate in a strategic, advisory tone focused on high-level impact.',
  friendly_tn:
    'Communicate in a warm, conversational, Tennessee-style friendly tone. Occasional Southern warmth is welcome.',
}

function stripCitations(text: string): string {
  return text
    .replace(/【[^】]*】/g, '')
    .replace(/^\[RF FORM\]\s*/i, '')
    .replace(/^\[TN LAW\]\s*/i, '')
    .replace(/^\[BEST PRACTICE\]\s*/i, '')
    .replace(/^\[MLS RULE\]\s*/i, '')
    .trim()
}

function extractActionBlock(text: string): {
  cleanedReply: string
  action: { type: string; data?: Record<string, unknown> } | null
} {
  const match = text.match(/REVA_ACTION:(\{[\s\S]*\})/m)
  if (!match) return { cleanedReply: text.trim(), action: null }
  try {
    const parsed = JSON.parse(match[1]) as { type: string; data?: Record<string, unknown> }
    return {
      cleanedReply: text.replace(match[0], '').trim(),
      action: parsed,
    }
  } catch {
    return { cleanedReply: text.trim(), action: null }
  }
}

export async function POST(request: Request) {
  try {
    const reqBody = await request.json()
    const {
      message,
      dealId,
      threadId: requestThreadId,
      context: requestContext,
      userId: bodyUserId,
    } = reqBody || {}
    const agentContext = reqBody?.agentContext ?? null

    if (!message) {
      return Response.json({ error: 'Message required' }, { status: 400 })
    }
    const isDriveMode = driveModeKeywords.some((kw) =>
      String(message).toLowerCase().includes(kw)
    )

    const internalSecret = request.headers.get('x-internal-reva-secret')
    const expectedSecret = process.env.REVA_INTERNAL_SECRET || ''
    const internalOk =
      Boolean(expectedSecret && internalSecret === expectedSecret && bodyUserId)

    let supabase: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>
    let userId: string
    let userEmail: string | undefined

    if (internalOk) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      userId = String(bodyUserId)
      const { data: prof } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle()
      userEmail = prof?.email ?? undefined
    } else {
      const cookieStore = cookies()
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // no-op in read-only server contexts
              }
            },
          },
        }
      )

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
      userEmail = user.email
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const assistantId = process.env.REVA_ASSISTANT_ID_TN

    if (!assistantId) {
      return Response.json({
        reply: 'Vera is not configured yet. Please contact support.',
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('assistant_style')
      .eq('id', userId)
      .maybeSingle()

    const selectedStyle = String(profile?.assistant_style || 'friendly_tn').replace('-', '_')
    const styleContext =
      styleInstructions[selectedStyle] || styleInstructions.friendly_tn
    const context = await buildRevaContext(supabase, userId, dealId, userEmail)

    const enrichedMessage = agentContext
      ? `${agentContext}\n\nAgent SMS message: ${message}`
      : message

    const nowChat = new Date()
    const todayLongChat = nowChat.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const todayIsoChat = nowChat.toISOString().split('T')[0]
    const dateAwarenessBlock = `CRITICAL DATE AWARENESS:
- Today is ${todayLongChat} (${todayIsoChat}).
- ANY closing_date, binding_date, or deadline that is BEFORE today is OVERDUE. Flag it immediately.
- Calculate exact days overdue or days remaining for every date you mention.
- NEVER say a past date is "ahead" or "coming up." If it's past, it's OVERDUE.
- Do not invent dates; use only dates from LIVE SYSTEM CONTEXT below.

`

    let threadId: string
    if (requestThreadId) {
      threadId = requestThreadId
    } else {
      const threadObj = await openai.beta.threads.create()
      threadId = threadObj.id
    }

    const fullMessage = `${dateAwarenessBlock}LIVE SYSTEM CONTEXT (use this for all deal questions):
${context}

IMPORTANT:
- For EMAIL requests: use REVA_ACTION send_email
- For SMS/TEXT requests: use REVA_ACTION send_sms
- Always use the exact CONTACT ID from CONTACT ID field above for that contact
- Never use a made-up or placeholder contact ID

RF401 KNOWLEDGE BASE — Tennessee Purchase and Sale Agreement (Version 03/31/2026):

BINDING AGREEMENT DATE — MOST CRITICAL FIELD:
The Binding Agreement Date is the date AND TIME the agent acknowledges receipt of the final accepted offer. ALL deadlines count from the DAY AFTER this date. Example: binding date April 1 + earnest due in 3 days = due April 4. Never call it the offer date or signing date. If it is blank or missing, flag it immediately.

KEY DEADLINES FROM BINDING AGREEMENT DATE:
- Day 3: Buyer applies for loan + pays credit report + notifies seller of lender (Notification form)
- Day 3: Earnest money due to Holder (TN standard — can be negotiated)
- Day 5: Cash buyers must provide proof of available funds
- Day 5: If appraisal contingent, buyer must order appraisal + give seller company name/phone
- Day 14: Buyer must notify seller of: (a) hazard insurance secured, (b) Intent to Proceed sent + funds available per loan estimate, (c) appraisal ordered and fee paid
- Inspection period: negotiated (Tri-Cities TN standard is 15 days)
- Resolution period: begins when seller receives buyer's written repair list; standard is 3 days
- HOA lien payoff: delivered to buyer's closing agent no later than 7 days before closing
- Final inspection: closing date or within 2 days prior

DEADLINE RULES (TN LAW):
- All time periods are CALENDAR days ending at 11:59 PM local time
- FOUR deadlines are FIRM even on weekends/holidays: Closing Date, Possession Date, Completion of Repair Deadline, Offer Expiration Date
- ALL OTHER deadlines roll to next business day if they land on Saturday, Sunday, or federal holiday
- Texting is NOT valid notice in Tennessee — valid methods: in person, prepaid overnight delivery, fax, USPS registered/certified mail, or email
- Counting starts the DAY AFTER the initial date (e.g., day after Binding Agreement Date = day 1)

SECTION 1 — PARTIES & PROPERTY:
- Buyer and seller names must be FULL LEGAL names exactly as they appear on the deed
- Instrument number is stamped on the recorded deed — varies by county; title company can provide
- Section A items convey AUTOMATICALLY — do not re-list them in Section B
- Section B: items NOT already in A that stay at no cost (freestanding fridge, non-built-in appliances)
- Section C: items that do NOT stay — confirm against seller's property disclosure (RF201)
- Section D leased items: buyer must know transfer fees, assumability, and payoff balance; if not assuming, seller pays cancellation fees and removes before closing; checkbox on line 33 MUST BE CHECKED to be part of agreement
- Propane tanks: any fuel must be invoiced and credited to seller at closing via ALTA

SECTION 2A — FINANCIAL CONTINGENCY (LOAN):
- LTV = percentage of purchase price being financed (not the down payment percentage)
- FHA 3.5% down = 96.5% LTV; VA zero down = 100% LTV; conventional varies
- THDA is NOT a standalone loan type — must be FHA-backed or VA-backed THDA
- FHA loan: FHA Addendum MUST be attached and listed in Section 20
- VA loan: VA Addendum MUST be attached and listed in Section 20
- Buyer can change loan terms but CANNOT increase costs to seller; use Notification 656 checkbox 8 to notify of lender change
- Day 3/14 default: seller sends Notification 20 (2-day warning) then Notification 21 (termination); seller has RIGHT to terminate but is NOT obligated

SECTION 2B — FINANCING CONTINGENCY WAIVED (CASH):
- Box MUST BE CHECKED — section is not active unless checked
- Cash buyers can still get a loan but lose financing contingency protections
- Proof of funds due within 5 days of binding date

SECTION 2C — APPRAISAL:
- Must select EITHER option 1 (not contingent) OR option 2 (IS contingent) — unchecked sections are NOT part of the agreement
- If appraisal comes in low and contingent: buyer has 3 days to waive OR terminate (earnest returned)
- If buyer fails to act within 3 days: contingency is deemed satisfied — buyer loses termination right
- Seller concession limits: FHA max 6% of purchase price; VA max 4%; Conventional 3% if LTV >90%, up to 6% if LTV ≤90%

SECTION 3 — EARNEST MONEY:
- If earnest check bounces: Holder notifies buyer → buyer has 1 day to deliver immediately available funds → failure = BUYER DEFAULT
- Earnest cannot be disbursed until 14 days after deposit unless bank clearance letter provided
- Holder disburses only at: closing, written agreement of all parties, court order, reasonable interpretation, or interpleader

SECTION 4 — CLOSING & POSSESSION:
- Closing expires at 11:59 PM local time on closing date — any extension must be in writing
- Possession options MUST be selected — unselected items are NOT part of the agreement
- Temporary occupancy requires RF635 form attached

SECTION 7 — LEAD-BASED PAINT:
- Required for ALL properties built BEFORE 1978 — attach RF209
- Built 1978 or later: check "does not apply"

SECTION 8 — INSPECTIONS:
- Seller MUST have all utilities AND pool/spa operational during inspection period
- Buyer covers all inspection costs including WDI (termite) report
- VA buyers CAN pay for termite letter (as of June 2022)
- Buyer waives cosmetic objections — no right to require cosmetic repairs
- Buyer has NO right to require repairs purely to meet current building codes unless required by government
- Submitting repair request list (RF654) ENDS inspection period and BEGINS resolution period
- Resolution period: negotiate in good faith; failure to agree = automatic termination + earnest returned
- Repair Amendment = RF655; Resolution Period Extension = RF653
- Section 8E Waiver of All Inspections: THIS BOX MUST BE CHECKED — flag prominently, rarely appropriate

SECTION 15 — HOME PROTECTION PLAN:
- NOT a home inspection substitute
- Must specify who pays, cost, provider, and which real estate company ordered it
- If agent pays from commission: title company must be notified; broker must approve
- Neither box checked = section is NOT part of the agreement

SECTION 17 — BINDING AGREEMENT DATE:
- Agents fill in acknowledgment of receipt section ONLY — agents do NOT sign as parties
- The time and date agents acknowledge receipt = Binding Agreement Date for all deadline purposes

SECTION 20 — EXHIBITS AND ADDENDA:
- Everything attached must be listed here
- FHA loan → FHA Addendum required
- VA loan → VA Addendum required
- Pre-1978 property → RF209 Lead-Based Paint Disclosure
- Temp occupancy → RF635
- Mediation → RF629
- Special stipulations overflow → RF621

SECTION 21 — SPECIAL STIPULATIONS:
- Overrides ALL preceding sections if there is a conflict
- NEVER use: "TBD", "N/A", "actual cost", "negotiable", or "etc." — these are unenforceable
- Use RF77 for pre-approved clause language — consult broker before drafting custom language
- Be specific and measurable on all terms

SECTION 22 — TIME LIMIT OF OFFER:
- Offer can be withdrawn any time before acceptance with notice
- Any blank is deemed zero or not applicable — offer expiration date/time CANNOT be blank
- Seller may: ACCEPT, COUNTER (attach counter offer), or REJECT

TOP 13 AGENT MISTAKES TO FLAG IMMEDIATELY:
1. Binding Agreement Date blank or wrong — all deadlines broken
2. FHA/VA loan selected but addendum not listed in Section 20
3. Earnest money due days left at 0 or blank — instant default risk
4. Inspection period days blank — blank = zero = no inspection rights
5. Neither appraisal checkbox selected — appraisal section not part of agreement
6. Special stipulations contain vague language (TBD, N/A, etc.)
7. Offer expiration time/date blank — no deadline = no urgency
8. Deed names differ from buyer names without notifying title company
9. Lead-based paint disclosure missing on pre-1978 property
10. Section 1A items re-listed in Section B — unnecessary and confusing
11. Cash buyer but Section 2B box not checked — financing contingency section is silent
12. Section 8E (waiver of all inspections) checked without agent realizing it
13. Home Protection Plan section left with neither box selected

COMMUNICATION STYLE: ${styleContext}

DRIVE MODE RULES:
When the authenticated user asks you to start, create, or add a new transaction or deal, collect the following information one question at a time:
1. Property address (street number and name)
2. City
3. Zip code
4. Is this a buyer or seller transaction?
5. Client name(s)
6. Do you have a closing date yet?
After collecting all 6 answers, confirm with the user and output this EXACT block on its own line:
REVA_ACTION:{"type":"create_transaction","data":{"address":"[full address]","city":"[city]","zip":"[zip]","client":"[client name]","client_type":"[buyer or seller]","closing_date":"[ISO date or null]","phase":"intake"}}
Then say: 'Transaction created! I've set up your deadlines and checklist. Upload the contract whenever you're ready and I'll read it for you.'
Ask ONE question at a time. Wait for the answer before asking the next. This is Drive Mode - the user may be hands-free.
Current context mode: ${requestContext || 'default'}

USER QUESTION: ${enrichedMessage}

Instructions: Search your knowledge base documents to answer this question. Cite the specific document and section. Use the live context above for any deal-specific questions.`

    // Load deal-specific OpenAI file IDs so Vera reads actual documents
    const attachments: { file_id: string; tools: [{ type: 'file_search' }] }[] = []
    if (dealId) {
      let { data: dealDocs } = await supabase
        .from('transaction_documents')
        .select('openai_file_id')
        .eq('transaction_id', Number(dealId))
        .not('openai_file_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)
      if (dealDocs && dealDocs.length > 0) {
        // OpenAI max 10 attachments per message — take most recent docs
        dealDocs = dealDocs.slice(0, 10)
        for (const d of dealDocs) {
          if (d.openai_file_id) {
            attachments.push({ file_id: d.openai_file_id, tools: [{ type: 'file_search' }] })
          }
        }
      }
    }
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: fullMessage,
      ...(attachments.length > 0 ? { attachments } : {})
    })

    try {
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      })

      const startTime = Date.now()
      let status = run.status

      while (
        status !== 'completed' &&
        status !== 'failed' &&
        status !== 'cancelled' &&
        status !== 'expired'
      ) {
        if (Date.now() - startTime > 45000) {
          return Response.json({
            reply: 'Vera is taking too long. Please try again.',
            threadId,
          })
        }

        await new Promise((r) => setTimeout(r, 1500))
        const updated = await openai.beta.threads.runs.retrieve(
          threadId,
          run.id
        )
        status = updated.status
      }

      if (status !== 'completed') {
        return Response.json({
          reply: 'I could not complete that request. Please try again.',
          threadId,
        })
      }

      const messages = await openai.beta.threads.messages.list(threadId)
      const latest = messages.data[0]
      const rawReply = latest.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text.value)
        .join('\n')

      let { cleanedReply, action } = extractActionBlock(rawReply || '')
      let transaction: unknown = null
      if (action?.type === 'create_transaction' && action.data) {
        const payload = action.data
        transaction = await createTransactionWithSetup(supabase as any, userId, {
          address: String(payload.address || ''),
          city: payload.city ? String(payload.city) : undefined,
          zip: payload.zip ? String(payload.zip) : undefined,
          client: String(payload.client || ''),
          client_type: payload.client_type ? String(payload.client_type) : 'buyer',
          closing_date: payload.closing_date ? String(payload.closing_date) : null,
          phase: payload.phase ? String(payload.phase) : 'intake',
          type: payload.client_type ? String(payload.client_type) : 'buyer',
        })
      }

      if (action?.type === 'send_email' && action.data) {
        const emailData = action.data as {
          contactId?: string
          subject?: string
          message?: string
          body?: string
        }
        const hasDealFocus = dealId != null && String(dealId).trim() !== ''
        if (!hasDealFocus && !String(emailData.contactId || '').trim()) {
          // skip: communications/send needs dealId or transaction contact id
        } else try {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || 'https://dealpilot-tn.vercel.app'
          const dealIdForSend = hasDealFocus
            ? parseInt(String(dealId), 10)
            : null
          const sendRes = await fetch(`${appUrl}/api/communications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') || '',
              ...(process.env.REVA_INTERNAL_SECRET
                ? { 'x-internal-reva-secret': process.env.REVA_INTERNAL_SECRET }
                : {}),
            },
            body: JSON.stringify({
              type: 'email',
              dealId: dealIdForSend,
              userId,
              transactionContactId: emailData.contactId ?? '',
              subject: emailData.subject || 'Message from ClosingPilot',
              message: emailData.body || emailData.message || '',
              triggeredByReva: true,
              ghlApiKey: process.env.GHL_API_KEY || '',
              ghlLocationId: process.env.GHL_LOCATION_ID || '',
              ghlSmsNumber: process.env.GHL_SMS_NUMBER || '',
            }),
          })
          const sendJson = await sendRes.json().catch(() => ({}))
          if (!sendJson.success) {
            cleanedReply += `\n\n⚠️ Email could not be sent: ${sendJson.error || 'Unknown error'}`
          } else {
            cleanedReply += `\n\n✅ Email sent successfully.`
          }
        } catch (sendErr: unknown) {
          const msg = sendErr instanceof Error ? sendErr.message : String(sendErr)
          cleanedReply += `\n\n⚠️ Email send failed: ${msg}`
        }
      }

      if (action?.type === 'send_sms' && action.data) {
        const smsData = action.data as {
          contactId?: string
          message?: string
        }
        const hasDealFocusSms = dealId != null && String(dealId).trim() !== ''
        if (!hasDealFocusSms && !String(smsData.contactId || '').trim()) {
          // skip
        } else try {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || 'https://dealpilot-tn.vercel.app'
          const dealIdForSms = hasDealFocusSms
            ? parseInt(String(dealId), 10)
            : null
          const sendRes = await fetch(`${appUrl}/api/communications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') || '',
              ...(process.env.REVA_INTERNAL_SECRET
                ? { 'x-internal-reva-secret': process.env.REVA_INTERNAL_SECRET }
                : {}),
            },
            body: JSON.stringify({
              type: 'sms',
              dealId: dealIdForSms,
              userId,
              transactionContactId: smsData.contactId || '',
              message: smsData.message || '',
              triggeredByReva: true,
              ghlApiKey: process.env.GHL_API_KEY || '',
              ghlLocationId: process.env.GHL_LOCATION_ID || '',
              ghlSmsNumber: process.env.GHL_SMS_NUMBER || '',
            }),
          })
          const sendJson = await sendRes.json().catch(() => ({}))
          if (!sendJson.success) {
            cleanedReply += `\n\n⚠️ SMS could not be sent: ${sendJson.error || 'Unknown error'}`
          } else {
            cleanedReply += `\n\n✅ SMS sent successfully.`
          }
        } catch (sendErr: unknown) {
          const msg = sendErr instanceof Error ? sendErr.message : String(sendErr)
          cleanedReply += `\n\n⚠️ SMS send failed: ${msg}`
        }
      }

      return Response.json({
        reply: stripCitations(cleanedReply || 'I could not find an answer. Please try again.'),
        threadId,
        transaction,
        triggerDriveMode: isDriveMode,
      })
    } catch (err: any) {
      console.error('Run error full:', JSON.stringify(err))
      return Response.json({
        reply: 'Error: ' + err.message,
        threadId,
        triggerDriveMode: isDriveMode,
      })
    }
  } catch (err: any) {
    console.error('Error caught in reva chat route:', err)
    console.error('Reva chat error:', err)
    return Response.json({
      reply: 'Something went wrong. Please try again.',
      threadId: null,
      triggerDriveMode: false,
    })
  }
}
