import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(req: Request){
  try{
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dealId = searchParams.get('deal_id')
    if(!dealId) return NextResponse.json({ error: 'deal_id required' }, { status: 400 })

    // Attempt to fetch contacts linked to this deal and last communication
    // We'll query deal_contacts -> contacts and left-join latest deal_communications by contact email/phone
    const sql = `
      select c.id, c.name, c.email, c.phone, dc.role,
        (select max(created_at) from deal_communications where deal_id = $1 and (recipient = c.email or recipient = c.phone)) as last_communication
      from deal_contacts dc
      join contacts c on c.id = dc.contact_id
      where dc.deal_id = $1
      order by last_communication desc nulls last, c.name
    `

    // Use RPC via supabase.raw? supabase-js doesn't expose raw SQL here; fall back to select with joins
    const { data, error } = await supabase
      .from('deal_contacts')
      .select('role, contacts(id, name, email, phone)')
      .eq('deal_id', dealId)

    if(error) throw error

    const contacts = (data || []).map((r:any) => ({
      id: r.contacts?.id,
      name: r.contacts?.name,
      email: r.contacts?.email,
      phone: r.contacts?.phone,
      role: r.role,
    }))

    // For each contact, fetch last communication timestamp
    for(const c of contacts){
      const { data: comms } = await supabase
        .from('deal_communications')
        .select('created_at')
        .eq('deal_id', dealId)
        .in('recipient', [c.email, c.phone].filter(Boolean))
        .order('created_at', { ascending: false })
        .limit(1)
      c.last_communication = comms && comms[0] ? comms[0].created_at : null
    }

    // Group by role for left-panel UI
    const grouped:any = {}
    for(const c of contacts){
      const role = c.role || 'other'
      if(!grouped[role]) grouped[role] = []
      grouped[role].push(c)
    }

    return NextResponse.json({ contacts, grouped })
  }catch(err:any){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
