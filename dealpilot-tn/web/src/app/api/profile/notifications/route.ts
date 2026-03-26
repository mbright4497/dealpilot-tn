import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const notification_prefs = body?.notification_prefs || {}
    const notification_email = body?.notification_email

    const payload: any = { id: user.id, notification_prefs, updated_at: new Date().toISOString() }
    if (typeof notification_email === 'string') payload.notification_email = notification_email

    const { data, error } = await supabase.from('profiles').upsert(payload).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
