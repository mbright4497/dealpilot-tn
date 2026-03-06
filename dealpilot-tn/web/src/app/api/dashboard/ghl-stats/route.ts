import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET() {
  try {
    // hardcoded user_id=1 for dashboard preview
    const userId = '1'

    const { data: tu, error: tuErr } = await supabase.from('tenant_users').select('tenant_id').eq('user_id', userId).limit(1)
    if (tuErr) throw tuErr
    if (!tu || tu.length === 0) {
      return NextResponse.json({ connected: false, messages_sent: 0, messages_limit: 0, recent_count: 0, last_message_at: null })
    }

    const tenantId = tu[0].tenant_id
    const { data: tenant, error: tenantErr } = await supabase.from('tenants').select('*').eq('id', tenantId).limit(1).single()
    if (tenantErr) throw tenantErr
    if (!tenant) {
      return NextResponse.json({ connected: false, messages_sent: 0, messages_limit: 0, recent_count: 0, last_message_at: null })
    }

    const messages_sent = (tenant.comms_email_used || 0) + (tenant.comms_sms_used || 0)
    const messages_limit = tenant.comms_email_limit || tenant.comms_sms_limit || 0

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recent_count } = await supabase.from('deal_communications').select('*', { count: 'exact' }).ilike('comm_type', 'ghl_%').gte('created_at', since)

    const { data: last } = await supabase.from('deal_communications').select('created_at').ilike('comm_type', 'ghl_%').order('created_at', { ascending: false }).limit(1)
    const last_message_at = (last && last.length > 0 && last[0].created_at) ? last[0].created_at : null

    const connected = !!tenant.ghl_api_key

    return NextResponse.json({ connected, messages_sent, messages_limit, recent_count: recent_count || 0, last_message_at, tenant_name: tenant.name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
