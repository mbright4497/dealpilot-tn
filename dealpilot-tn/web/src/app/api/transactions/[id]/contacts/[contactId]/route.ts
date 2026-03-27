import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function parseTransactionId(rawId: string): number | null {
  const id = Number(rawId)
  if (!Number.isFinite(id)) return null
  return id
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

    const { data: existing, error: existingError } = await supabase
      .from('transaction_contacts')
      .select('id')
      .eq('id', contactId)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const name = String(body?.name || '').trim()
    const role = String(body?.role || '').trim()
    const phone = String(body?.phone || '').trim() || null
    const email = String(body?.email || '').trim() || null
    const company = String(body?.company || '').trim() || null
    const notes = String(body?.notes || '').trim() || null

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!role) return NextResponse.json({ error: 'Role is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('transaction_contacts')
      .update({ name, role, phone, email, company, notes })
      .eq('id', contactId)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contact: data })
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

    const { error } = await supabase
      .from('transaction_contacts')
      .delete()
      .eq('id', contactId)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not delete contact' }, { status: 500 })
  }
}
