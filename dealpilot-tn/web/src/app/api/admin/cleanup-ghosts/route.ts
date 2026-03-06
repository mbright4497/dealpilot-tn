import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST() {
  try {
    // Step 1: select all rows and filter in JS per instructed exact approach
    const { data, error: selErr } = await supabase.from('deal_state').select('*')
    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })

    const ghosts = (data || []).filter((r: any) => !r.binding_date && (!r.address || r.address === '') && (!r.client || r.client === ''))
    const ids = ghosts.map((r: any) => r.id)

    if (ids.length > 0) {
      const { error: delErr } = await supabase.from('deal_state').delete().in('id', ids)
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: ids.length, ids })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
