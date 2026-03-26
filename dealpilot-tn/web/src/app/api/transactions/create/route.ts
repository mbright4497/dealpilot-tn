import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { autoSetupTransaction } from '@/lib/reva/autoSetupTransaction'

export const dynamic = 'force-dynamic'

interface TransactionCreatePayload {
  address?: string
  client_name?: string
  purchase_price?: number
  closing_date?: string
  deal_type?: string
}

export async function POST(req: Request){
  try{
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = (await req.json()) as TransactionCreatePayload
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

    const { data, error } = await supabase.from('transactions').insert(insert).select('*').single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    const id = data.id
    try {
      const setup = await autoSetupTransaction(supabase, data)
      return NextResponse.json({ ok: true, id, url: `/deal/${id}`, setup })
    } catch (setupError) {
      console.error('autoSetupTransaction failed (create)', setupError)
      return NextResponse.json({
        ok: true,
        id,
        url: `/deal/${id}`,
        setup: { deadlinesCreated: 0, checklistCreated: 0, error: 'Auto-setup failed' },
      })
    }
  }catch(error){
    console.error('POST /api/transactions/create error', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
