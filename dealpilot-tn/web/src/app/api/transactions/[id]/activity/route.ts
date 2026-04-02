import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TimelineEventType =
  | 'document'
  | 'checklist'
  | 'reva'
  | 'communication'
  | 'system'
  | 'warning'
  | 'call'

type TimelineEvent = {
  id: string
  activity_type: TimelineEventType
  title: string
  description: string | null
  created_at: string
  source: 'manual' | 'documents' | 'checklist' | 'communication' | 'transaction'
}

const MANUAL_TYPES = new Set(['call', 'email', 'note', 'meeting'])

function asIso(input: unknown): string | null {
  if (typeof input !== 'string' || !input) return null
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function mapManualTypeToActivityType(type: string): TimelineEventType {
  const t = type.toLowerCase()
  if (t === 'call') return 'call'
  if (t === 'email') return 'communication'
  if (t === 'note') return 'system'
  if (t === 'meeting') return 'system'
  if (t === 'warning') return 'warning'
  if (t === 'reva') return 'reva'
  if (t === 'sms' || t === 'ghl_sms' || t === 'ghl_email' || t === 'communication') return 'communication'
  return 'system'
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseInt(String(params.id), 10)
  if (Number.isNaN(transactionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id, user_id, updated_at, created_at, ai_checklist, activity_log')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (txErr || !tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const [docsRes, commsRes, manualRes] = await Promise.all([
      supabase
        .from('transaction_documents')
        .select('id, display_name, document_type, status, created_at, updated_at, extracted_data')
        .eq('transaction_id', transactionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('communication_log')
        .select('id, channel, recipient, subject, body, created_at, sent_at, status')
        .eq('deal_id', transactionId)
        .order('created_at', { ascending: false }),
      supabase
        .from('transaction_activity')
        .select('id, activity_type, title, description, metadata, created_at')
        .eq('transaction_id', transactionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    const events: TimelineEvent[] = []

    for (const row of docsRes.data || []) {
      const uploadedAt = asIso(row.created_at) || new Date().toISOString()
      events.push({
        id: `doc_uploaded_${row.id}`,
        activity_type: 'document',
        title: `${row.display_name || 'Document'} uploaded`,
        description: `Type: ${row.document_type || 'document'}`,
        created_at: uploadedAt,
        source: 'documents',
      })

      if (String(row.status || '').toLowerCase() === 'reviewed') {
        events.push({
          id: `doc_reviewed_${row.id}`,
          activity_type: 'document',
          title: `${row.display_name || 'Document'} reviewed`,
          description: 'Vera completed document review.',
          created_at: asIso(row.updated_at) || uploadedAt,
          source: 'documents',
        })
      }

      const extracted = row.extracted_data as Record<string, unknown> | null
      const yearBuiltRaw =
        extracted?.year_built ?? extracted?.yearBuilt ?? extracted?.built_year ?? extracted?.property_year_built
      const yearBuilt = Number(yearBuiltRaw)
      if (Number.isFinite(yearBuilt) && yearBuilt > 0 && yearBuilt < 1978) {
        events.push({
          id: `doc_warning_leadpaint_${row.id}`,
          activity_type: 'warning',
          title: 'Lead paint disclosure may be required',
          description: `Property year built appears to be ${yearBuilt}.`,
          created_at: asIso(row.updated_at) || uploadedAt,
          source: 'documents',
        })
      }
    }

    const checklist = Array.isArray(tx.ai_checklist) ? tx.ai_checklist : []
    for (let idx = 0; idx < checklist.length; idx += 1) {
      const item = checklist[idx] as Record<string, unknown>
      if (!item || item.completed !== true) continue
      const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Checklist item'
      events.push({
        id: `check_${String(item.id || idx)}`,
        activity_type: 'checklist',
        title: `${title} completed`,
        description: typeof item.notes === 'string' ? item.notes : null,
        created_at: asIso(item.completed_at) || asIso(tx.updated_at) || new Date().toISOString(),
        source: 'checklist',
      })
    }

    const legacyActivity = Array.isArray(tx.activity_log) ? tx.activity_log : []
    for (let idx = 0; idx < legacyActivity.length; idx += 1) {
      const item = legacyActivity[idx] as Record<string, unknown>
      const title =
        typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : 'Activity update'
      const icon = String(item.icon || '')
      const type: TimelineEventType = icon.includes('🤖')
        ? 'reva'
        : icon.includes('⚠')
          ? 'warning'
          : icon.includes('✅')
            ? 'checklist'
            : icon.includes('📞')
              ? 'call'
              : icon.includes('📧')
                ? 'communication'
                : icon.includes('📄')
                  ? 'document'
                  : 'system'
      events.push({
        id: `legacy_${idx}_${asIso(item.timestamp) || tx.updated_at || Date.now()}`,
        activity_type: type,
        title,
        description: null,
        created_at: asIso(item.timestamp) || asIso(tx.updated_at) || new Date().toISOString(),
        source: 'transaction',
      })
    }

    for (const c of commsRes.data || []) {
      const channel = String(c.channel || 'message').toLowerCase()
      const recipient = c.recipient ? String(c.recipient) : 'recipient'
      const at = asIso(c.sent_at) || asIso(c.created_at) || new Date().toISOString()
      const titlePrefix = channel === 'email' ? 'Email sent' : channel === 'sms' ? 'Message sent' : 'Communication sent'
      const subject = c.subject ? `re: ${String(c.subject)}` : null
      events.push({
        id: `comm_${c.id}`,
        activity_type: channel === 'email' ? 'communication' : channel === 'sms' ? 'communication' : 'communication',
        title: `${titlePrefix} to ${recipient}`,
        description: subject || (c.body ? String(c.body).slice(0, 180) : null),
        created_at: at,
        source: 'communication',
      })
    }

    for (const m of manualRes.data || []) {
      events.push({
        id: `manual_${m.id}`,
        activity_type: mapManualTypeToActivityType(String(m.activity_type || 'note')),
        title: String(m.title || 'Manual activity'),
        description: m.description ? String(m.description) : null,
        created_at: asIso(m.created_at) || new Date().toISOString(),
        source: 'manual',
      })
    }

    if (tx.created_at) {
      events.push({
        id: `tx_created_${tx.id}`,
        activity_type: 'system',
        title: 'Transaction created',
        description: null,
        created_at: asIso(tx.created_at) || new Date().toISOString(),
        source: 'transaction',
      })
    }

    if (tx.updated_at) {
      events.push({
        id: `tx_updated_${tx.id}`,
        activity_type: 'system',
        title: 'Transaction updated',
        description: null,
        created_at: asIso(tx.updated_at) || new Date().toISOString(),
        source: 'transaction',
      })
    }

    const deduped = new Map<string, TimelineEvent>()
    for (const event of events) {
      const key = `${event.activity_type}|${event.title}|${event.created_at}`
      if (!deduped.has(key)) deduped.set(key, event)
    }

    const sorted = Array.from(deduped.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ events: sorted })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseInt(String(params.id), 10)
  if (Number.isNaN(transactionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (txErr || !tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const type = String(body.type || '').toLowerCase()
    const title = String(body.title || '').trim()
    const description = String(body.note || body.description || '').trim()
    const createdAtRaw = asIso(body.created_at || body.date_time)
    const createdAt = createdAtRaw || new Date().toISOString()

    if (!MANUAL_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transaction_activity')
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        activity_type: type,
        title,
        description: description || null,
        metadata: { source: 'manual' },
        created_at: createdAt,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ activity: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
