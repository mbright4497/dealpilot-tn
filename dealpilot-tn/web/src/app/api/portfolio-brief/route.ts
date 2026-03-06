import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET() {
  const { data, error } = await supabase
    .from('deal_state')
    .select('id')
    .neq('current_state', 'closed')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const activeCount = (data || []).length

  if (activeCount === 0) {
    return NextResponse.json({ summary: 'No active transactions today.' })
  }

  const summary = `You have ${activeCount} active transactions. Focus on inspection timelines and document completion. Stay ahead of deadlines today.`.trim()

  return NextResponse.json({ summary })
}
