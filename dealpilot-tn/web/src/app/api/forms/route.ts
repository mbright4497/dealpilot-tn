import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const transactionId = url.searchParams.get('transaction_id')
  try {
    const supabase = createServerSupabaseClient()
    if (transactionId) {
      const { data } = await supabase.from('form_instances').select('*').eq('transaction_id', Number(transactionId)).order('created_at', { ascending: false })
      return NextResponse.json(data || [])
    }
    const { data } = await supabase.from('form_instances').select('*').order('created_at', { ascending: false })
    return NextResponse.json(data || [])
  } catch (err:any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
