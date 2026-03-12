import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { action, resource, resource_id, details } = body
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('audit_logs').insert([{ user_id: null, action, resource, resource_id, details: JSON.stringify(details || {}), created_at: new Date().toISOString() }])
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
