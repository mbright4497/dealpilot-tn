export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: Request){
  try{
    let supabase = null
    let user = null
    try{
      supabase = createServerSupabaseClient()
      try{ const supRes = await supabase.auth.getUser(); user = supRes?.data?.user || null }catch(_){ user = null }
    }catch(err){ console.warn('notifications auth init failed', err); return NextResponse.json({ error: 'Unauthorized' }, { status:401 }) }
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status:401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    let query = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
    if(type) query = query.eq('type', type)
    const { data, error } = await query
    if(error) throw error
    return NextResponse.json({ notifications: data || [] })
  }catch(err:any){ return NextResponse.json({ error: err.message || String(err) }, { status:500 }) }
}

export async function POST(req: Request){
  try{
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status:401 })

    const body = await req.json().catch(()=> ({}))
    const { deal_id, type, title, message, metadata } = body as any
    if(!type) return NextResponse.json({ error: 'type required' }, { status:400 })

    const insert = { user_id: user.id, deal_id: deal_id || null, type, title: title || null, message: message || null, metadata: metadata || {} }
    const { data, error } = await supabase.from('notifications').insert(insert).select().single()
    if(error) throw error
    return NextResponse.json({ notification: data })
  }catch(err:any){ return NextResponse.json({ error: err.message || String(err) }, { status:500 }) }
}

export async function PATCH(req: Request){
  try{
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status:401 })

    const body = await req.json().catch(()=> ({}))
    const { id, read } = body as any
    if(!id) return NextResponse.json({ error: 'id required' }, { status:400 })

    const { data, error } = await supabase.from('notifications').update({ read: !!read }).eq('id', id).eq('user_id', user.id).select().single()
    if(error) throw error
    return NextResponse.json({ notification: data })
  }catch(err:any){ return NextResponse.json({ error: err.message || String(err) }, { status:500 }) }
}
