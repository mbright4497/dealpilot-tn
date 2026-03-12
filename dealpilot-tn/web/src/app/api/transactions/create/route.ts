import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export const dynamic = 'force-dynamic'

export async function POST(req: Request){
  try{
    const supabase = createServerSupabaseClient({ req, res: undefined as any })
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await req.json()
    const { address, client_name, purchase_price, closing_date, deal_type } = body
    if(!address || !client_name) return NextResponse.json({ error: 'address and client_name required' }, { status: 400 })

    const insert = {
      property_address: address,
      client_name: client_name,
      purchase_price: purchase_price || null,
      closing_date: closing_date || null,
      deal_type: deal_type || null,
      status: 'active',
      user_id: user.id,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('transactions').insert(insert).select('id').single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    const id = data.id
    return NextResponse.json({ ok: true, id, url: `/deal/${id}` })
  }catch(e:any){
    return NextResponse.json({ error: String(e?.message||e) }, { status: 500 })
  }
}
