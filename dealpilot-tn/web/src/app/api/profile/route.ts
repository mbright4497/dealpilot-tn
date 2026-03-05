import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request){
  const supabase = createServerSupabaseClient({ request, response: undefined as any })
  const { data } = await supabase.auth.getUser()
  const user = data?.user || null
  if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if(error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(profile)
}

export async function POST(request: Request){
  // support form POST with _method=put
  const supabase = createServerSupabaseClient({ request, response: undefined as any })
  const { data } = await supabase.auth.getUser()
  const user = data?.user || null
  if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = request.headers.get('content-type') || ''
  let body: any = {}
  if (contentType.includes('application/json')) body = await request.json().catch(()=>({}))
  else {
    const form = await request.formData().catch(()=>null)
    if(form){ form.forEach((v,k)=>{ body[k]=v }) }
  }

  if((body._method||'').toLowerCase() === 'put'){
    const updates:any = {}
    if(body.full_name!==undefined) updates.full_name = body.full_name
    if(body.brokerage!==undefined) updates.brokerage = body.brokerage
    if(body.phone!==undefined) updates.phone = body.phone
    if(body.license_number!==undefined) updates.license_number = body.license_number

    const { data: updated, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Unsupported method' }, { status: 400 })
}
