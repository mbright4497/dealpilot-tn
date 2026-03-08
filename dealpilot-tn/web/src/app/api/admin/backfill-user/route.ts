export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient({ request, response: undefined as any })
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user || null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as any
    const userId = body?.user_id
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const { error: txErr } = await supabase.from('transactions').update({ user_id: userId }).is('user_id', null)
    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

    const { error: docErr } = await supabase.from('documents').update({ user_id: userId }).is('user_id', null)
    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status: 500 })
  }
}
