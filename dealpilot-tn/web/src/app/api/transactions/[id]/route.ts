import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { id: string } }){
  const id = Number(params.id)
  if(isNaN(id)) return NextResponse.json({}, { status: 200 })
  try{
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle()
    if(error) return NextResponse.json({}, { status: 200 })
    return NextResponse.json(data || {})
  }catch(e:any){ console.error('transactions/id error', e); return NextResponse.json({}, { status: 200 }) }
}
