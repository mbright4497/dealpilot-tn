import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST() {
  try {
    const { data, error } = await supabase
      .from('deal_state')
      .delete()
      .match({})
      .or("(address.is.null,address.eq.'')")

    // The Supabase JS client doesn't return deleted count reliably for all adapters.
    // Run a raw RPC to get affected rows if available, but fallback to data length.
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const deletedCount = Array.isArray(data) ? data.length : 0
    return NextResponse.json({ deleted: deletedCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
