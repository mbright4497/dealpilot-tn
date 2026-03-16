export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const FIELD_KEY = 'rf401_wizard'

type Params = { params: { transactionId: string } }

export async function GET(_: NextRequest, { params }: Params) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deal_field_values')
    .select('*')
    .eq('deal_id', params.transactionId)
    .eq('field_key', FIELD_KEY)
    .order('entered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest, { params }: Params) {
  const supabase = getSupabase()
  const body = await request.json().catch(() => null)
  const payload = body?.payload
  const mode = body?.mode === 'submitted' ? 'submitted' : 'draft'
  if (!payload) {
    return NextResponse.json({ error: 'payload required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('deal_field_values')
    .insert({
      deal_id: params.transactionId,
      template_id: null,
      field_key: FIELD_KEY,
      value: { ...payload, status: mode },
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
