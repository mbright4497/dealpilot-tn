import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient({ request, response: undefined as any })
  try {
    const body = await request.json().catch(() => ({})) as any
    const id = body?.id
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: any = {}
    if (body.rf_number !== undefined) updates.rf_number = body.rf_number
    if (body.category !== undefined) updates.category = body.category
    if (body.name !== undefined) updates.name = body.name

    const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
