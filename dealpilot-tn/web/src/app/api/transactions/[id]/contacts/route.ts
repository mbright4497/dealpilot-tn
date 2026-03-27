import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  assertTransactionOwnedByUser,
  loadTransactionContacts,
  newContactFromPostBody,
  parseTransactionIdParam,
  saveTransactionContacts,
  toApiContactRow,
} from '@/lib/transactionContactsJsonb'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseTransactionIdParam(params.id)
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const owned = await assertTransactionOwnedByUser(supabase, transactionId, user.id)
    if (owned.error) {
      const status = owned.notFound ? 404 : 500
      return NextResponse.json({ error: owned.error }, { status })
    }

    const { contacts, error, notFound } = await loadTransactionContacts(supabase, transactionId, user.id)
    if (error) {
      const status = notFound ? 404 : 500
      return NextResponse.json({ error }, { status })
    }

    const mapped = contacts.map((c) => toApiContactRow(transactionId, user.id, c))
    return NextResponse.json({ contacts: mapped })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not load contacts'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseTransactionIdParam(params.id)
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const owned = await assertTransactionOwnedByUser(supabase, transactionId, user.id)
    if (owned.error) {
      const status = owned.notFound ? 404 : 500
      return NextResponse.json({ error: owned.error }, { status })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const created = newContactFromPostBody(body)
    if (!created) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { contacts: existing, error: loadErr, notFound } = await loadTransactionContacts(
      supabase,
      transactionId,
      user.id
    )
    if (loadErr) {
      const status = notFound ? 404 : 500
      return NextResponse.json({ error: loadErr }, { status })
    }

    const next = [...existing, created]
    const { error: saveErr } = await saveTransactionContacts(supabase, transactionId, user.id, next)
    if (saveErr) return NextResponse.json({ error: saveErr }, { status: 500 })

    return NextResponse.json({ contact: toApiContactRow(transactionId, user.id, created) }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not create contact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
