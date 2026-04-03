import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type InspectorPatchBody = {
  name?: string
  company?: string
  phone?: string
  email?: string
  booking_method?: string
  booking_url?: string
  specialties?: string[]
  notes?: string
  preferred?: boolean
  active?: boolean
}

function buildInspectorUpdates(body: InspectorPatchBody) {
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.company !== undefined) updates.company = body.company
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.email !== undefined) updates.email = body.email
  if (body.booking_method !== undefined) updates.booking_method = body.booking_method
  if (body.booking_url !== undefined) updates.booking_url = body.booking_url
  if (body.specialties !== undefined) updates.specialties = body.specialties
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.preferred !== undefined) updates.preferred = body.preferred
  if (body.active !== undefined) updates.active = body.active
  return updates
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('inspectors')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ inspector: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as InspectorPatchBody
    const updates = buildInspectorUpdates(body)
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('inspectors')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ inspector: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('inspectors')
      .update({ active: false })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ inspector: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
