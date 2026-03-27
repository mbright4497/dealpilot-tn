import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  assertTransactionOwnedByUser,
  loadTransactionContacts,
  parseTransactionIdParam,
  saveTransactionContacts,
  toApiContactRow,
  type TransactionJsonContact,
} from '@/lib/transactionContactsJsonb'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const transactionId = parseTransactionIdParam(params.id)
  const contactId = String(params.contactId || '').trim()
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  if (!contactId) return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })

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

    const { contacts, error: loadErr, notFound } = await loadTransactionContacts(
      supabase,
      transactionId,
      user.id
    )
    if (loadErr) {
      const status = notFound ? 404 : 500
      return NextResponse.json({ error: loadErr }, { status })
    }

    const idx = contacts.findIndex((c) => c.id === contactId)
    if (idx === -1) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(body?.name || '').trim()
    let role = String(body?.role || '').trim()
    const phone = String(body?.phone || '').trim() || null
    const email = String(body?.email || '').trim() || null
    const company = String(body?.company || '').trim() || null
    const notes = String(body?.notes || '').trim() || null

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!role) role = 'other'

    const prev = contacts[idx]
    const updated: TransactionJsonContact = {
      ...prev,
      name,
      role,
      phone,
      email,
      company,
      notes,
    }

    const next = contacts.slice()
    next[idx] = updated

    const { error: saveErr } = await saveTransactionContacts(supabase, transactionId, user.id, next)
    if (saveErr) return NextResponse.json({ error: saveErr }, { status: 500 })

    return NextResponse.json({ contact: toApiContactRow(transactionId, user.id, updated) })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not update contact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const transactionId = parseTransactionIdParam(params.id)
  const contactId = String(params.contactId || '').trim()
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  if (!contactId) return NextResponse.json({ error: 'Invalid contact id' }, { status: 400 })

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

    const { contacts, error: loadErr, notFound } = await loadTransactionContacts(
      supabase,
      transactionId,
      user.id
    )
    if (loadErr) {
      const status = notFound ? 404 : 500
      return NextResponse.json({ error: loadErr }, { status })
    }

    const next = contacts.filter((c) => c.id !== contactId)
    if (next.length === contacts.length) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const { error: saveErr } = await saveTransactionContacts(supabase, transactionId, user.id, next)
    if (saveErr) return NextResponse.json({ error: saveErr }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not delete contact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
