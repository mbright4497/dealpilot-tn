import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** All transaction_inspectors rows for the logged-in user with nested inspector + deal. */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('transaction_inspectors')
      .select(
        `
        id,
        transaction_id,
        inspection_type,
        scheduled_at,
        status,
        report_received,
        notes,
        created_at,
        inspectors (
          id,
          name,
          company,
          phone,
          email,
          category,
          booking_method
        ),
        transactions (
          id,
          address
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ assignments: data ?? [] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not load service providers'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
