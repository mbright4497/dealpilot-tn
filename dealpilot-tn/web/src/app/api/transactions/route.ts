import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('id', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
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
