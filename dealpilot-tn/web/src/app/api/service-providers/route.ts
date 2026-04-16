import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const category = req.nextUrl.searchParams.get('category')

    let query = supabase
      .from('inspectors')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('preferred', { ascending: false })
      .order('name', { ascending: true })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Service providers fetch error')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ providers: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as InspectorInsertBody

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

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
      active: true,
    }

    const { data, error } = await supabase.from('inspectors').insert(row).select().single()

    if (error) {
      console.error('Service provider create error')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ provider: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
