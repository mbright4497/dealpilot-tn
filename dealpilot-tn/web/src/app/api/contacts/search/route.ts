export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
export const runtime = 'nodejs'

export async function GET(req: Request){
  try{
    const supabase = createServerSupabaseClient({ request: req as any, response: undefined as any })
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const ghlOnly = searchParams.get('ghl_only') === 'true'

    let builder = supabase.from('contacts').select('id,name,email,phone,company,ghl_contact_id').ilike('name', `%${q}%`).order('name', { ascending: true }).limit(50)
    if(ghlOnly) builder = (supabase.from('contacts') as any).select('id,name,email,phone,company,ghl_contact_id').ilike('name', `%${q}%`).not('ghl_contact_id','is',null).order('name',{ascending:true}).limit(50)

    const { data, error } = await builder
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contacts: data || [] })
  }catch(err:any){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
