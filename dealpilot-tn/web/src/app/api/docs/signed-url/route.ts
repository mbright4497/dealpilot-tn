import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = getSupabase()

export async function POST(request: Request) {
  try{
    const body = await request.json().catch(()=>null)
    const path = body?.path
    const bucket = body?.bucket || 'deal-documents'
    if(!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

    const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(path, 300)
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ signedUrl: data?.signedUrl || null })
  }catch(e:any){
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
