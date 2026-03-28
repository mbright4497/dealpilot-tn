import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createGHLContact } from '@/lib/ghl/ghlClient'
import {
  assertTransactionOwnedByUser,
  loadTransactionContacts,
  newContactFromPostBody,
  parseTransactionIdParam,
  saveTransactionContacts,
  toApiContactRow,
  type TransactionJsonContact,
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

    let contactOut: TransactionJsonContact = created

    const { data: profile } = await supabase
      .from('profiles')
      .select('ghl_api_key, ghl_location_id')
      .eq('id', user.id)
      .single()

    const ghlKey = profile?.ghl_api_key ? String(profile.ghl_api_key).trim() : ''
    if (ghlKey) {
      try {
        const ghlResult = await createGHLContact(ghlKey, {
          name: created.name,
          email: created.email,
          phone: created.phone,
          locationId: String(profile?.ghl_location_id || '').trim(),
        })
        if (ghlResult?.id) {
          const { contacts: afterSave, error: reloadErr } = await loadTransactionContacts(
            supabase,
            transactionId,
            user.id
          )
          if (!reloadErr) {
            const updated = afterSave.map((c) =>
              c.id === created.id ? { ...c, ghl_contact_id: ghlResult.id } : c
            )
            const { error: patchErr } = await saveTransactionContacts(
              supabase,
              transactionId,
              user.id,
              updated
            )
            if (!patchErr) {
              const merged = updated.find((c) => c.id === created.id)
              if (merged) contactOut = merged
            } else {
              console.warn('[transactions/contacts] GHL id patch save failed:', patchErr)
            }
          } else {
            console.warn('[transactions/contacts] reload contacts after GHL sync failed:', reloadErr)
          }
        }
      } catch (e) {
        console.warn('[transactions/contacts] GHL sync failed:', e)
      }
    }

    return NextResponse.json({ contact: toApiContactRow(transactionId, user.id, contactOut) }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not create contact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
