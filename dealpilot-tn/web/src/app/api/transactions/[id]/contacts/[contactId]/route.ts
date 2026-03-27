import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { contactDisplayName, updateContactFields } from '@/lib/transactionDealContacts'

function parseTransactionId(rawId: string): string | null {
  if (!rawId || rawId.trim() === '') return null
  return rawId.trim()
}

async function assertTransactionOwnership(transactionId: string, userId: string): Promise<string | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('agent_id', userId)
    .maybeSingle()

  if (error) {
    console.error('assertTransactionOwnership:', error.message)
    return error.message
  }
  if (!data) return 'Transaction not found'
  return null
}

function mapDealContactResponse(
  transactionId: string,
  userId: string,
  dc: Record<string, unknown>
) {
  const c = (dc.contacts as Record<string, unknown> | null) || null
  const name = contactDisplayName(c)
  const created =
    (typeof dc.created_at === 'string' && dc.created_at) ||
    (c && typeof c.created_at === 'string' && c.created_at) ||
    new Date().toISOString()
  return {
    id: String(dc.id),
    transaction_id: transactionId,
    user_id: userId,
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
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const transactionId = parseTransactionId(params.id)
  const contactId = String(params.contactId || '').trim()
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  if (!contactId) return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ownershipErr = await assertTransactionOwnership(transactionId, user.id)
    if (ownershipErr) return NextResponse.json({ error: ownershipErr }, { status: ownershipErr === 'Transaction not found' ? 404 : 500 })

    const dealUuid = transactionId

    const { data: existing, error: existingError } = await supabase
      .from('deal_contacts')
      .select('id, contact_id, deal_id')
      .eq('id', contactId)
      .eq('deal_id', dealUuid)
      .maybeSingle()

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

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

    const contactRowId = String((existing as { contact_id?: string }).contact_id || '')
    if (!contactRowId) return NextResponse.json({ error: 'Invalid contact link' }, { status: 500 })

    const upd = await updateContactFields(supabase, contactRowId, { name, email, phone, company, notes })
    if (upd.error) return NextResponse.json({ error: upd.error }, { status: 500 })

    const { error: linkErr } = await supabase
      .from('deal_contacts')
      .update({ role, comm_preference })
      .eq('id', contactId)
      .eq('deal_id', dealUuid)

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

    const { data: fresh, error: freshErr } = await supabase
      .from('deal_contacts')
      .select('id, deal_id, contact_id, role, comm_preference, notes, created_at, contacts(*)')
      .eq('id', contactId)
      .eq('deal_id', dealUuid)
      .maybeSingle()

    if (freshErr) return NextResponse.json({ error: freshErr.message }, { status: 500 })
    if (!fresh) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    return NextResponse.json({ contact: mapDealContactResponse(transactionId, user.id, fresh as Record<string, unknown>) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not update contact' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const transactionId = parseTransactionId(params.id)
  const contactId = String(params.contactId || '').trim()
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  if (!contactId) return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ownershipErr = await assertTransactionOwnership(transactionId, user.id)
    if (ownershipErr) return NextResponse.json({ error: ownershipErr }, { status: ownershipErr === 'Transaction not found' ? 404 : 500 })

    const dealUuid = transactionId

    const { error } = await supabase
      .from('deal_contacts')
      .delete()
      .eq('id', contactId)
      .eq('deal_id', dealUuid)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not delete contact' }, { status: 500 })
  }
}
