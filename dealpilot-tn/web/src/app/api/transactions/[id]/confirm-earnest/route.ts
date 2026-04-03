import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendGHLSMS } from '@/lib/ghl/ghlClient'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tx, error: loadErr } = await supabase
      .from('transactions')
      .select('id, address, user_id, earnest_money_confirmed')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
    if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (tx.earnest_money_confirmed === true) {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { data: updated, error: upErr } = await supabase
      .from('transactions')
      .update({
        earnest_money_confirmed: true,
        earnest_money_confirmed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const addrShort = String(updated?.address || '').trim() || 'the property'
    const { error: actErr } = await supabase.from('transaction_activity').insert({
      transaction_id: id,
      user_id: user.id,
      activity_type: 'vera_earnest_confirmed',
      title: 'Earnest money confirmed',
      description: `Earnest money marked received for ${addrShort}`,
      metadata: { confirmed_at: now },
    })
    if (actErr) {
      console.error('[confirm-earnest] transaction_activity insert failed:', actErr.message)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, ghl_contact_id')
      .eq('id', user.id)
      .maybeSingle()

    const ghlKey = process.env.GHL_API_KEY || ''
    const ghlFrom = process.env.GHL_SMS_NUMBER || ''
    const ghlLoc = process.env.GHL_LOCATION_ID || ''

    if (ghlKey && profile?.phone) {
      const msg = `✅ Earnest money confirmed for ${addrShort}!`
      const smsRes = await sendGHLSMS(
        ghlKey,
        profile.phone,
        ghlFrom,
        msg,
        profile.ghl_contact_id || null,
        ghlLoc,
        null,
        { allowPhoneOnlyRecipient: !profile.ghl_contact_id }
      )
      if (!smsRes.success) {
        console.error('[confirm-earnest] agent SMS failed:', smsRes.error)
      }
    }

    return NextResponse.json({ transaction: updated })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Confirm failed'
    console.error('[confirm-earnest]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
