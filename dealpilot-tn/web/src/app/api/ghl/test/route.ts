export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    let { tenant_id, ghl_location_id, ghl_api_key } = body as any

    if (tenant_id) {
      const { data: t, error: terr } = await supabase.from('tenants').select('ghl_location_id,ghl_api_key').eq('id', tenant_id).limit(1).single()
      if (terr) return NextResponse.json({ success: false, error: terr.message }, { status: 500 })
      if (!t) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
      ghl_location_id = t.ghl_location_id
      ghl_api_key = t.ghl_api_key
    }

    if (!ghl_location_id || !ghl_api_key) return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })

    const url = `https://services.leadconnectorhq.com/locations/${encodeURIComponent(ghl_location_id)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${ghl_api_key}`, Version: '2021-07-28' } })

    if (res.status === 200) {
      const j = await res.json().catch(()=>null)
      return NextResponse.json({ success: true, location_name: j?.name || 'Connected' })
    }
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401 })
    }
    if (res.status === 404) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ success: false, error: 'Connection failed' }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 })
  }
}
