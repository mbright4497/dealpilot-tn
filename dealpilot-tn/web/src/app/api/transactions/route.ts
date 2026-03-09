import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (url: any, options: any = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

export async function GET() {
  // check authenticated user (optional)
  const authSupabase = createServerSupabaseClient()
  const { data: userData } = await authSupabase.auth.getUser()
  const user = userData?.user || null

  let q = supabase.from('transactions').select('*').order('id', { ascending: true })
  if (user) q = q.eq('user_id', user.id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()

  // get auth user
  const authSupabase = createServerSupabaseClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      address: body.address || '',
      client: body.client || '',
      type: body.type || 'Buyer',
      status: body.status || 'Active',
      binding: body.binding || '',
      closing: body.closing || '',
      notes: body.notes || '',
      contacts: body.contacts || '[]',
      purchase_price: body.purchase_price ?? null,
      earnest_money: body.earnest_money ?? null,
      seller_names: body.seller_names || '',
      buyer_names: body.buyer_names || '',
      inspection_end_date: body.inspection_end_date || null,
      financing_contingency_date: body.financing_contingency_date || null,
      special_stipulations: body.special_stipulations || '',
      contract_type: body.contract_type || 'buyer',
      timeline: body.timeline || [],
      issues: body.issues || [],
      documents: body.documents || [],
      user_id: user?.id || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
