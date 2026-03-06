-- Migration note: create profiles table if not exists
-- SQL schema (run as migration):
-- CREATE TABLE IF NOT EXISTS profiles (
--   id UUID PRIMARY KEY REFERENCES auth.users(id),
--   full_name TEXT,
--   phone TEXT,
--   brokerage_company TEXT,
--   license_number TEXT,
--   notification_prefs JSONB DEFAULT '{}',
--   subscription_tier TEXT DEFAULT 'free',
--   created_at TIMESTAMPTZ DEFAULT now(),
--   updated_at TIMESTAMPTZ DEFAULT now()
-- );

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).limit(1).single()
    if (error && error.code === 'PGRST116') {
      // table not found
      return NextResponse.json({ profile: null })
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { full_name, phone, brokerage_company, license_number, notification_prefs } = body as any

    // try update existing
    const updates: any = { updated_at: new Date().toISOString() }
    if (full_name !== undefined) updates.full_name = full_name
    if (phone !== undefined) updates.phone = phone
    if (brokerage_company !== undefined) updates.brokerage_company = brokerage_company
    if (license_number !== undefined) updates.license_number = license_number
    if (notification_prefs !== undefined) updates.notification_prefs = notification_prefs

    // attempt update
    const { data, error } = await supabase.from('profiles').upsert({ id: user.id, ...updates }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // also update auth user_metadata full_name if provided
    if (full_name) {
      await supabase.auth.updateUser({ data: { full_name } })
    }

    return NextResponse.json({ profile: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
