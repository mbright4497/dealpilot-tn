import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  contactDisplayName,
  insertContactForOwner,
  resolveDealUuidForTransaction,
} from '@/lib/transactionDealContacts'

function parseTransactionId(rawId: string): number | null {
  const id = Number(rawId)
  if (!Number.isFinite(id)) return null
  return id
}

async function assertTransactionOwnership(transactionId: number, userId: string): Promise<string | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return error.message
  if (!data) return 'Transaction not found'
  return null
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseTransactionId(params.id)
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ownershipErr = await assertTransactionOwnership(transactionId, user.id)
    if (ownershipErr) return NextResponse.json({ error: ownershipErr }, { status: ownershipErr === 'Transaction not found' ? 404 : 500 })

    const { dealUuid } = await resolveDealUuidForTransaction(supabase, transactionId, user.id)
    if (!dealUuid) {
      return NextResponse.json({ contacts: [] })
    }

    const { data, error } = await supabase
      .from('deal_contacts')
      .select('id, deal_id, contact_id, role, comm_preference, notes, created_at, contacts(*)')
      .eq('deal_id', dealUuid)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []) as Record<string, unknown>[]
    const mapped = rows.map((dc) => {
      const c = (dc.contacts as Record<string, unknown> | null) || null
      const name = contactDisplayName(c)
      const created =
        (typeof dc.created_at === 'string' && dc.created_at) ||
        (c && typeof c.created_at === 'string' && c.created_at) ||
        new Date().toISOString()
      return {
        id: String(dc.id),
        transaction_id: transactionId,
        user_id: user.id,
        role: typeof dc.role === 'string' ? dc.role : 'other',
        name,
        phone: c && typeof c.phone === 'string' ? c.phone : null,
        email: c && typeof c.email === 'string' ? c.email : null,
        company: c && typeof c.company === 'string' ? c.company : null,
        notes:
          (typeof dc.notes === 'string' && dc.notes) ||
          (c && typeof c.notes === 'string' ? c.notes : null) ||
          null,
        created_at: created,
      }
    })

    return NextResponse.json({ contacts: mapped })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not load contacts' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseTransactionId(params.id)
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ownershipErr = await assertTransactionOwnership(transactionId, user.id)
    if (ownershipErr) return NextResponse.json({ error: ownershipErr }, { status: ownershipErr === 'Transaction not found' ? 404 : 500 })

    const { dealUuid, error: dealErr } = await resolveDealUuidForTransaction(supabase, transactionId, user.id)
    if (!dealUuid) {
      return NextResponse.json({ error: dealErr || 'Could not resolve deal for transaction' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const name = String(body?.name || '').trim()
    let role = String(body?.role || '').trim()
    const phone = String(body?.phone || '').trim() || null
    const email = String(body?.email || '').trim() || null
    const company = String(body?.company || '').trim() || null
    const notes = String(body?.notes || '').trim() || null
    const commPreferenceRaw = body?.comm_preference
    const comm_preference =
      typeof commPreferenceRaw === 'string' && commPreferenceRaw.trim()
        ? commPreferenceRaw.trim()
        : 'email'

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!role) role = 'other'

    const inserted = await insertContactForOwner(supabase, user.id, {
      name,
      email,
      phone,
      company,
      notes,
      roleLabel: role,
    })
    if ('error' in inserted) {
      return NextResponse.json({ error: inserted.error }, { status: 500 })
    }

    const { data: link, error: linkErr } = await supabase
      .from('deal_contacts')
      .insert({
        deal_id: dealUuid,
        contact_id: inserted.id,
        role,
        comm_preference,
      })
      .select('id, deal_id, contact_id, role, comm_preference, notes, created_at, contacts(*)')
      .single()

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

    const dc = link as Record<string, unknown>
    const c = (dc.contacts as Record<string, unknown> | null) || null
    const displayName = contactDisplayName(c)
    const created =
      (typeof dc.created_at === 'string' && dc.created_at) ||
      (c && typeof c.created_at === 'string' && c.created_at) ||
      new Date().toISOString()

    const mapped = {
      id: String(dc.id),
      transaction_id: transactionId,
      user_id: user.id,
      role: typeof dc.role === 'string' ? dc.role : role,
      name: displayName,
      phone: c && typeof c.phone === 'string' ? c.phone : null,
      email: c && typeof c.email === 'string' ? c.email : null,
      company: c && typeof c.company === 'string' ? c.company : null,
      notes:
        (typeof dc.notes === 'string' && dc.notes) ||
        (c && typeof c.notes === 'string' ? c.notes : null) ||
        null,
      created_at: created,
    }

    return NextResponse.json({ contact: mapped }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not create contact' }, { status: 500 })
  }
}
