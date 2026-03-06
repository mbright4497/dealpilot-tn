import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST() {
  try {
    // Step 1: select candidate ids using binding_date IS NULL and client NULL/empty
    const { data: candidates, error: selErr } = await supabase
      .from('deal_state')
      .select('id,client,binding_date')
      .is('binding_date', null)

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })

    const ghosts = (candidates || []).filter((r: any) => !r.client || r.client === '')
    const ids = ghosts.map((r: any) => r.id)
    if (!ids.length) return NextResponse.json({ deleted: 0 })

    const { data, error } = await supabase.from('deal_state').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const deletedCount = Array.isArray(data) ? data.length : ids.length
    return NextResponse.json({ deleted: deletedCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
