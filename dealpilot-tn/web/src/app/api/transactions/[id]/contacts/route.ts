import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

    const { data, error } = await supabase
      .from('transaction_contacts')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contacts: data ?? [] })
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
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        role,
        name,
        phone,
        email,
        company,
        notes,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contact: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Could not create contact' }, { status: 500 })
  }
}
