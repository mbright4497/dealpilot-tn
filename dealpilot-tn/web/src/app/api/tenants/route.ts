export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    global: {
      fetch: (url: any, options: any = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

function maskKey(key?: string) {
  if (!key) return null
  const s = String(key)
  if (s.length <= 4) return '****'
  return '****' + s.slice(-4)
}

export async function GET(req: Request) {
  try {
    const auth = createServerSupabaseClient()
    const { data: { user } } = await auth.auth.getUser()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const user_id_param = searchParams.get('user_id')

    const user_id = user?.id || user_id_param || null

    if (!id && !user_id) return NextResponse.json({ error: 'id or user_id required' }, { status: 400 })

    if (id) {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', id).limit(1).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      data.ghl_api_key = maskKey(data.ghl_api_key)
      return NextResponse.json({ tenant: data })
    }

    if (user_id) {
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user_id)
        .limit(1)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const tenantId = data[0].tenant_id
      const { data: t, error: terr } = await supabase.from('tenants').select('*').eq('id', tenantId).limit(1).single()
      if (terr) return NextResponse.json({ error: terr.message }, { status: 500 })
      if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      t.ghl_api_key = maskKey(t.ghl_api_key)
      return NextResponse.json({ tenant: t })
    }

    return NextResponse.json({ error: 'Unexpected' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = createServerSupabaseClient()
    const { data: { user } } = await auth.auth.getUser()

    const body = await req.json().catch(() => ({}))
    const { name, ghl_location_id, ghl_api_key, messages_limit } = body as any
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const insert = {
      name,
      ghl_location_id: ghl_location_id || null,
      ghl_api_key: ghl_api_key || null,
      comms_email_limit: messages_limit || 1000,
      comms_sms_limit: messages_limit || 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('tenants').insert(insert).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    data.ghl_api_key = maskKey(data.ghl_api_key)

    // if user exists, upsert tenant_users
    if (user && data && data.id) {
      await supabase.from('tenant_users').insert({ tenant_id: data.id, user_id: user.id }).onConflict('tenant_id,user_id').ignore()
    }

    return NextResponse.json({ tenant: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = createServerSupabaseClient()
    const { data: { user } } = await auth.auth.getUser()

    const body = await req.json().catch(() => ({}))
    const { id, ghl_location_id, ghl_api_key, messages_limit, name } = body as any
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: any = { updated_at: new Date().toISOString() }
    if (ghl_location_id !== undefined) updates.ghl_location_id = ghl_location_id
    if (ghl_api_key !== undefined) updates.ghl_api_key = ghl_api_key
    if (messages_limit !== undefined) { updates.comms_email_limit = messages_limit; updates.comms_sms_limit = messages_limit }
    if (name !== undefined) updates.name = name

    const { data, error } = await supabase.from('tenants').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    data.ghl_api_key = maskKey(data.ghl_api_key)
    return NextResponse.json({ tenant: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
