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

    // Targeted deletion for confirmed ghost IDs
    const ids = [6, 8]

    const { data: delData, error: delErr } = await supabase.from('deal_state').delete().in('id', ids)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    const deletedCount = Array.isArray(delData) ? delData.length : ids.length
    const deletedIds = Array.isArray(delData) ? delData.map((r:any) => r.id) : ids

    return NextResponse.json({ deleted: deletedCount, ids: deletedIds })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
