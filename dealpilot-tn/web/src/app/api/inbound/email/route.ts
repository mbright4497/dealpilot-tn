/*
 * Run in Supabase SQL editor:
 *
 * CREATE TABLE IF NOT EXISTS inbound_email_log (
 *   id SERIAL PRIMARY KEY,
 *   from_email TEXT NOT NULL,
 *   from_name TEXT,
 *   subject TEXT,
 *   body_text TEXT,
 *   message_id TEXT,
 *   transaction_id INTEGER REFERENCES transactions(id),
 *   contact_id UUID, -- JSONB contact id from transactions.contacts[].id
 *   status TEXT NOT NULL DEFAULT 'received', -- received, matched, unmatched, responded, replied, error
 *   vera_response TEXT,
 *   error_message TEXT,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- RLS: service role only (no user access needed)
 * ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY;
 * -- No policies = only service role can access
 *
 * -- Persist Vera thread per transaction (if this column is not already present):
 * ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;
 *
 * Note: contact_id stores the UUID from transactions.contacts[].id (JSONB contact id).
 */

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type InboundEmailBody = {
  from_email: string
  from_name?: string
  subject: string
  body_text: string
  body_html?: string
  message_id?: string
  date?: string
}

type TransactionContactsRow = {
  id: number
  address: string | null
  user_id: string
  status: string | null
  openai_thread_id: string | null
  contacts: unknown
}

type JsonbContact = {
  id?: string
  name?: string
  role?: string
  email?: string | null
  ghl_contact_id?: string | null
}

const styleInstructions: Record<string, string> = {
  joyful: 'Communicate in an upbeat, energetic, encouraging tone. Use enthusiasm.',
  straight: 'Communicate in a concise, no-frills, direct tone. No fluff.',
  calm: 'Communicate in a measured, reassuring, professional tone.',
  executive:
    'Communicate in a strategic, advisory tone focused on high-level impact.',
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

function extractActionBlock(text: string): { cleanedReply: string } {
  const match = text.match(/REVA_ACTION:(\{[\s\S]*\})/m)
  if (!match) return { cleanedReply: text.trim() }
  return { cleanedReply: text.replace(match[0], '').trim() }
}

function plainTextFromBody(body: InboundEmailBody): string {
  const raw = (body.body_text || '').trim()
  if (raw) return raw
  const html = (body.body_html || '').trim()
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function verifyBearer(request: Request): boolean {
  const expected = process.env.INBOUND_WEBHOOK_SECRET || ''
  if (!expected) return false
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${expected}`
}

function escapeHtmlForEmail(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plain-text Vera reply → simple HTML for GHL (newlines → br, minimal wrapper). */
function veraPlainTextToEmailHtml(plain: string): string {
  const normalized = plain.replace(/\r\n/g, '\n')
  const escaped = escapeHtmlForEmail(normalized)
  const withBreaks = escaped.split('\n').join('<br>')
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#111">${withBreaks}</div>`
}

export async function POST(request: Request) {
  if (!verifyBearer(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: any
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      // Try JSON as fallback
      body = await request.json()
    }

    {
      const { from_email, from_name, subject, body_text, body_html, date } = body
      Object.assign(body, {
        from_email,
        from_name,
        subject: String(subject || '').trim(),
        body_text,
        body_html,
        date,
      })
    }

    const fromEmailRaw = String(body.from_email || '').trim()
    const fromEmail = fromEmailRaw.toLowerCase()
    const subject = String(body.subject || '').trim()
    const bodyPlain = plainTextFromBody(body as InboundEmailBody)

    if (!fromEmail || !subject) {
      return Response.json({
        success: false,
        error: 'from_email and subject are required',
      })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('inbound/email: Supabase service configuration missing')
      return Response.json({ success: false, error: 'Internal error' })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const { data: transactions, error: matchError } = await supabase
      .from('transactions')
      .select('id, address, status, user_id, openai_thread_id, contacts')
      .not('status', 'in', '("closed","cancelled","withdrawn")')
      .not('contacts', 'is', null)
      .order('updated_at', { ascending: false })

    if (matchError) {
      console.error('inbound/email: contact match query failed', matchError)
      return Response.json({ success: false, error: 'Internal error' })
    }

    let matchedTransaction: TransactionContactsRow | null = null
    let matchedContact: JsonbContact | null = null

    for (const txn of (transactions || []) as TransactionContactsRow[]) {
      const contacts = txn.contacts as unknown
      if (!Array.isArray(contacts)) continue
      const contact = contacts.find(
        (c: JsonbContact) =>
          c.email && String(c.email).toLowerCase() === fromEmail
      )
      if (contact) {
        matchedTransaction = txn
        matchedContact = contact
        break
      }
    }

    if (!matchedTransaction || !matchedContact) {
      const { error: logErr } = await supabase.from('inbound_email_log').insert({
        from_email: fromEmail,
        from_name: body.from_name || null,
        subject,
        body_text: bodyPlain || null,
        message_id: body.message_id || null,
        transaction_id: null,
        contact_id: null,
        status: 'unmatched',
        vera_response: null,
        error_message: null,
      })
      if (logErr) {
        console.error('inbound/email: unmatched log insert failed', logErr)
      }
      return Response.json({
        success: true,
        matched: false,
        message: 'No matching contact found',
      })
    }

    const tx = matchedTransaction
    const propertyAddress = (tx.address || '').trim() || 'Unknown property'
    const agentUserId = tx.user_id
    const transactionId = tx.id

    const { data: logInsert, error: logInsertErr } = await supabase
      .from('inbound_email_log')
      .insert({
        from_email: fromEmail,
        from_name: body.from_name || null,
        subject,
        body_text: bodyPlain || null,
        message_id: body.message_id || null,
        transaction_id: transactionId,
        contact_id: matchedContact.id ?? null,
        status: 'matched',
        vera_response: null,
        error_message: null,
      })
      .select('id')
      .single()

    if (logInsertErr) {
      console.error('inbound/email: matched log insert failed', logInsertErr)
    }
    const logId = logInsert?.id as number | undefined

    const openaiKey = process.env.OPENAI_API_KEY
    const assistantId =
      process.env.OPENAI_ASSISTANT_ID || process.env.REVA_ASSISTANT_ID_TN
    if (!openaiKey || !assistantId) {
      console.error('inbound/email: OpenAI assistant or API key not configured')
      if (logId != null) {
        await supabase
          .from('inbound_email_log')
          .update({
            status: 'error',
            error_message: 'OpenAI not configured',
          })
          .eq('id', logId)
      }
      return Response.json({ success: false, error: 'Internal error' })
    }

    const openai = new OpenAI({ apiKey: openaiKey })

    let threadId = tx.openai_thread_id?.trim() || null
    if (!threadId) {
      const threadObj = await openai.beta.threads.create()
      threadId = threadObj.id
      const { error: thrUpdErr } = await supabase
        .from('transactions')
        .update({ openai_thread_id: threadId })
        .eq('id', transactionId)
      if (thrUpdErr) {
        console.error('inbound/email: failed to persist openai_thread_id', thrUpdErr)
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('assistant_style')
      .eq('id', agentUserId)
      .maybeSingle()

    const selectedStyle = String(profile?.assistant_style || 'friendly_tn').replace(
      '-',
      '_'
    )
    const styleContext =
      styleInstructions[selectedStyle] || styleInstructions.friendly_tn

    const { data: agentProf } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', agentUserId)
      .maybeSingle()
    const userEmail = agentProf?.email ?? undefined

    const context = await buildRevaContext(
      supabase,
      agentUserId,
      transactionId,
      userEmail
    )

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

    const inboundBlock = `Message from ${matchedContact.name} (${matchedContact.role}) on ${propertyAddress}:
Subject: ${subject}
${body.date ? `Date: ${body.date}\n` : ''}
${bodyPlain || '(no plain text body)'}`

    const fullMessage = `${dateAwarenessBlock}LIVE SYSTEM CONTEXT (use this for all deal questions):
${context}

COMMUNICATION STYLE: ${styleContext}

INBOUND EMAIL (reply helpfully as Vera for this transaction; prefer a plain-text reply suitable for email — do not repeat internal context blocks):

${inboundBlock}

Instructions: Search your knowledge base where relevant. Use the live context for deal-specific questions. Address the contact by name when natural.`

    const attachments: { file_id: string; tools: [{ type: 'file_search' }] }[] =
      []
    let { data: dealDocs } = await supabase
      .from('transaction_documents')
      .select('openai_file_id')
      .eq('transaction_id', Number(transactionId))
      .not('openai_file_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)
    if (dealDocs && dealDocs.length > 0) {
      dealDocs = dealDocs.slice(0, 10)
      for (const d of dealDocs) {
        if (d.openai_file_id) {
          attachments.push({
            file_id: d.openai_file_id,
            tools: [{ type: 'file_search' }],
          })
        }
      }
    }

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: fullMessage,
      ...(attachments.length > 0 ? { attachments } : {}),
    })

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
        if (logId != null) {
          await supabase
            .from('inbound_email_log')
            .update({
              status: 'error',
              error_message: 'Assistant run timed out',
            })
            .eq('id', logId)
        }
        return Response.json({ success: false, error: 'Internal error' })
      }
      await new Promise((r) => setTimeout(r, 1500))
      const updated = await openai.beta.threads.runs.retrieve(threadId, run.id)
      status = updated.status
    }

    if (status !== 'completed') {
      if (logId != null) {
        await supabase
          .from('inbound_email_log')
          .update({
            status: 'error',
            error_message: `Run ended with status ${status}`,
          })
          .eq('id', logId)
      }
      return Response.json({ success: false, error: 'Internal error' })
    }

    const messages = await openai.beta.threads.messages.list(threadId)
    const latest = messages.data[0]
    const rawReply = latest.content
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text?: { value?: string } }) => c.text?.value || '')
      .join('\n')

    const { cleanedReply } = extractActionBlock(rawReply || '')
    const veraResponse = stripCitations(
      cleanedReply || 'I could not find an answer. Please try again.'
    )

    const replySubject = `Re: ${propertyAddress}`

    if (logId != null) {
      const { error: logUpdErr } = await supabase
        .from('inbound_email_log')
        .update({
          status: 'responded',
          vera_response: veraResponse,
        })
        .eq('id', logId)
      if (logUpdErr) {
        console.error('inbound/email: log update failed', logUpdErr)
      }
    }

    let ghlSent = false
    try {
      const ghlKey = (process.env.GHL_API_KEY || '').trim()
      const recipientEmail = String(matchedContact.email || fromEmailRaw)
        .trim()
        .toLowerCase()
      const ghlContactIdFromDeal = String(
        matchedContact.ghl_contact_id || ''
      ).trim()

      if (!ghlKey) {
        console.warn('inbound/email: GHL_API_KEY not configured; skipping GHL email send')
      } else if (!recipientEmail) {
        console.warn('inbound/email: no recipient email for GHL send')
      } else {
        let ghlContactId = ghlContactIdFromDeal

        if (!ghlContactId) {
          const lookupUrl = `https://services.leadconnectorhq.com/contacts/lookup/email/${encodeURIComponent(recipientEmail)}`
          const lookupRes = await fetch(lookupUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${ghlKey}`,
              Version: '2021-07-28',
              Accept: 'application/json',
            },
          })

          if (!lookupRes.ok) {
            if (lookupRes.status === 404) {
              console.warn('inbound/email: GHL contact not found for sender email')
            } else {
              console.error('inbound/email: GHL contact lookup failed', {
                status: lookupRes.status,
              })
            }
          } else {
            const lookupJson = (await lookupRes.json().catch(() => ({}))) as {
              contact?: { id?: string }
              id?: string
            }
            ghlContactId = String(
              lookupJson?.contact?.id || lookupJson?.id || ''
            ).trim()
          }
        }

        if (!ghlContactId) {
          if (!ghlContactIdFromDeal) {
            console.warn('inbound/email: GHL lookup returned no contact id')
          }
        } else {
          const htmlBody = veraPlainTextToEmailHtml(veraResponse)
          const ghlLoc = (process.env.GHL_LOCATION_ID || '').trim()
          const sendRes = await fetch(
            'https://services.leadconnectorhq.com/conversations/messages',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${ghlKey}`,
                Version: '2021-07-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'Email',
                contactId: ghlContactId,
                message: htmlBody,
                subject: replySubject,
                emailFrom: 'vera@ihomehq.com',
                html: htmlBody,
                ...(ghlLoc ? { locationId: ghlLoc } : {}),
              }),
            }
          )

          if (!sendRes.ok) {
            console.error('inbound/email: GHL email send failed', {
              status: sendRes.status,
            })
          } else {
            ghlSent = true
            if (logId != null) {
              const { error: repliedErr } = await supabase
                .from('inbound_email_log')
                .update({ status: 'replied' })
                .eq('id', logId)
              if (repliedErr) {
                console.error('inbound/email: log update to replied failed', repliedErr)
              }
            }
          }
        }
      }
    } catch {
      console.error('inbound/email: GHL outbound email error')
    }

    return Response.json({
      success: true,
      matched: true,
      transaction_id: transactionId,
      contact_name: matchedContact.name,
      contact_role: matchedContact.role,
      contact_email: matchedContact.email || fromEmailRaw,
      vera_response: veraResponse,
      subject: replySubject,
      ghl_sent: ghlSent,
    })
  } catch {
    console.error('inbound/email: unhandled error')
    return Response.json({ success: false, error: 'Internal error' })
  }
}
