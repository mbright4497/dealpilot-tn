import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, { params }: { params: { id: string } }){
  try{
    const supabase = createServerSupabaseClient({ req, res: undefined as any })
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const id = Number(params.id)
    if(!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }catch(e:any){
    return NextResponse.json({ error: String(e?.message||e) }, { status: 500 })
  }
}
