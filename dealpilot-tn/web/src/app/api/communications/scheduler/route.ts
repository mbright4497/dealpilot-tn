export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function GET(){
  const supabase = getSupabaseSafe()
  // find contacts with no communication in last 3 days
  const threeDaysAgo = new Date(Date.now() - 3*24*60*60*1000).toISOString()
  // approach: left join contacts with latest communication_log by contact_id
  const { data, error } = await supabase
    .from('contacts')
    .select(`*, communication_log!inner(id, created_at)`)
    .lte('communication_log.created_at', threeDaysAgo)
  if(error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true, overdue: data })
}
