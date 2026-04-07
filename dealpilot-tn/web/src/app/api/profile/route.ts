export const dynamic = 'force-dynamic'
/*
Migration note: create profiles table if not exists

SQL schema (run as migration):

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  phone TEXT,
  brokerage_company TEXT,
  license_number TEXT,
  notification_prefs JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
*/

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,brokerage,phone,license_number,state,user_type,ghl_api_key,ghl_location_id,ghl_contact_id,notification_prefs,notification_email,subscription_tier,created_at,updated_at')
      .eq('id', user.id)
      .limit(1)
      .single()
    if (error && error.code === 'PGRST116') {
      // table not found
      return NextResponse.json({ profile: null })
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: { ...data, email: user.email } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const {
      full_name,
      phone,
      brokerage,
      license_number,
      notification_prefs,
      state,
      user_type,
      ghl_api_key,
      ghl_location_id,
      ghl_contact_id,
      notification_email,
      vera_auto_send,
    } = body as any

    // try update existing
    const updates: any = { updated_at: new Date().toISOString() }
    if (full_name !== undefined) updates.full_name = full_name
    if (phone !== undefined) updates.phone = phone
    if (brokerage !== undefined) updates.brokerage = brokerage
    if (license_number !== undefined) updates.license_number = license_number
    if (notification_prefs !== undefined) updates.notification_prefs = notification_prefs
    if (state !== undefined) updates.state = state
    if (user_type !== undefined) updates.user_type = user_type
    if (ghl_api_key !== undefined) updates.ghl_api_key = ghl_api_key
    if (ghl_location_id !== undefined) updates.ghl_location_id = ghl_location_id
    if (ghl_contact_id !== undefined) updates.ghl_contact_id = ghl_contact_id
    if (notification_email !== undefined) updates.notification_email = notification_email
    if (vera_auto_send !== undefined) updates.vera_auto_send = vera_auto_send

    // Prefer UPDATE so partial patches never rely on INSERT upsert quirks (RLS / defaults).
    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    let data = updated
    if (!data) {
      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert({ id: user.id, ...updates })
        .select()
        .single()
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
      data = inserted
    }

    // also update auth user_metadata full_name if provided
    if (full_name) {
      await supabase.auth.updateUser({ data: { full_name } })
    }

    return NextResponse.json({ profile: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
