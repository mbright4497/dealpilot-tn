export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try{
    const body = await request.json().catch(()=>null)
    const path = body?.path
    const bucket = body?.bucket || 'deal-documents'
    if(!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300)
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ signedUrl: data?.signedUrl || null })
  }catch(e:any){
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
