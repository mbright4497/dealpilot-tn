import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createGHLContact, sendGHLSMS } from '@/lib/ghl/ghlClient'
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
    console.log('[contacts POST] handler reached, starting GHL sync check')
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

    console.log('[contacts POST] about to load GHL credentials')
    const { data: profile } = await supabase
      .from('profiles')
      .select('ghl_api_key, ghl_location_id, full_name, phone, ghl_contact_id')
      .eq('id', user.id)
      .single()

    let ghlResult: Awaited<ReturnType<typeof createGHLContact>> | null = null
    const ghlKey = process.env.GHL_API_KEY || String(profile?.ghl_api_key || '').trim()
    const locationId = process.env.GHL_LOCATION_ID || String(profile?.ghl_location_id || '').trim()
    if (ghlKey) {
      try {
        ghlResult = await createGHLContact(ghlKey, {
          name: created.name,
          email: created.email,
          phone: created.phone,
          locationId,
        })
        if (ghlResult?.id) {
          const { contacts: afterSave, error: reloadErr } = await loadTransactionContacts(
            supabase,
            transactionId,
            user.id
          )
          if (!reloadErr) {
            const updated = afterSave.map((c) =>
              c.id === created.id ? { ...c, ghl_contact_id: ghlResult!.id } : c
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
    } else {
      console.log('[contacts POST] GHL createGHLContact skipped: no ghl_api_key (or empty after trim)')
    }

    console.log('[contacts POST] GHL sync result:', JSON.stringify(ghlResult))
    console.log('[contacts POST] ghl_api_key present:', !!profile?.ghl_api_key)
    console.log('[contacts POST] location_id:', profile?.ghl_location_id)

    const roleLower = contactOut.role.toLowerCase()
    const isAgentRole = roleLower.includes('agent') || roleLower.includes('broker')
    if (!isAgentRole && contactOut.phone && ghlKey) {
      const { data: txRow } = await supabase
        .from('transactions')
        .select('address, closing_date, user_id')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .maybeSingle()

      const address = txRow?.address || 'your property'
      const closingDate = txRow?.closing_date
        ? new Date(txRow.closing_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'TBD'
      const firstName = contactOut.name.split(' ')[0] || 'there'
      const agentName = profile?.full_name || 'your agent'

      const welcomeMessage = `Hi ${firstName}! I'm Vera, your AI transaction coordinator for ${address}. I'll keep you updated through closing on ${closingDate}. Text me anytime with questions. - Vera for ${agentName}`

      const welcomeRes = await sendGHLSMS(
        ghlKey,
        contactOut.phone,
        process.env.GHL_SMS_NUMBER || '',
        welcomeMessage,
        contactOut.ghl_contact_id,
        locationId,
        null,
        { allowPhoneOnlyRecipient: !contactOut.ghl_contact_id }
      )

      if (!welcomeRes.success) {
        console.error('[contacts POST] Vera welcome SMS failed:', welcomeRes.error)
      }

      if (welcomeRes.success && profile?.phone) {
        const notifyMessage = `✅ Vera sent welcome to ${contactOut.name} (${contactOut.role}) for ${address}.`
        await sendGHLSMS(
          ghlKey,
          profile.phone,
          process.env.GHL_SMS_NUMBER || '',
          notifyMessage,
          profile.ghl_contact_id,
          locationId,
          null,
          { allowPhoneOnlyRecipient: !profile.ghl_contact_id }
        )
      }

      if (welcomeRes.success) {
        const { error: actErr } = await supabase.from('transaction_activity').insert({
          transaction_id: transactionId,
          user_id: user.id,
          activity_type: 'vera_welcome_sent',
          title: 'Vera welcome SMS',
          description: `Welcome sent to ${contactOut.name}`,
          metadata: { contact_name: contactOut.name },
        })
        if (actErr) {
          console.error('[contacts POST] transaction_activity insert failed:', actErr.message)
        }
      }
    }

    return NextResponse.json({ contact: toApiContactRow(transactionId, user.id, contactOut) }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not create contact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
