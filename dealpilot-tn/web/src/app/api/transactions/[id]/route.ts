import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: any){
  try{
    const id = params.id
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json().catch(()=>({})) as any
    const fields = body.fields || {}

    const { data: existing } = await supabase.from('transactions').select('*').eq('id', id).single()
    if(!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const update: any = {}
    for(const k of Object.keys(fields)){
      update[k] = fields[k]
    }

    const { data, error } = await supabase.from('transactions').update(update).eq('id', id).select().single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status: 500 })
  }
}
