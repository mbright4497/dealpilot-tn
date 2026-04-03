import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type InspectorInsertBody = {
  name?: string
  company?: string
  phone?: string
  email?: string
  booking_method?: string
  booking_url?: string
  specialties?: string[]
  notes?: string
  preferred?: boolean
  category?: string
}

function buildInspectorUpdates(body: InspectorInsertBody & { active?: boolean }) {
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
  if (body.category !== undefined) {
    const c = typeof body.category === 'string' ? body.category.trim().toLowerCase() : ''
    updates.category = c || 'inspector'
  }
  return updates
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('inspectors')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('preferred', { ascending: false })
      .order('name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inspectors: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as InspectorInsertBody
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const categoryRaw = typeof body.category === 'string' ? body.category.trim().toLowerCase() : ''
    const category = categoryRaw || 'inspector'

    const row = {
      user_id: user.id,
      name,
      company: body.company ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      booking_method: body.booking_method ?? 'call',
      booking_url: body.booking_url ?? null,
      specialties: Array.isArray(body.specialties) ? body.specialties : [],
      notes: body.notes ?? null,
      preferred: body.preferred ?? false,
      category,
    }

    const { data, error } = await supabase.from('inspectors').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inspector: data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as InspectorInsertBody & { id?: string }
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

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

export async function DELETE(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let id: string | null = null
    const url = new URL(req.url)
    const fromQuery = url.searchParams.get('id')
    if (fromQuery) id = fromQuery.trim()
    if (!id) {
      const body = (await req.json().catch(() => ({}))) as { id?: string }
      if (typeof body.id === 'string') id = body.id.trim()
    }
    if (!id) return NextResponse.json({ error: 'id is required (query or JSON body)' }, { status: 400 })

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
