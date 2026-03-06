import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ghlClient } from '@/lib/ghl'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await req.json().catch(() => ({}))
    const { comm_type, deal_id, contact_id, recipient, subject, body, ai_generated } = payload as any

    if (!comm_type || !deal_id || !contact_id || !recipient || !body) {
      return NextResponse.json({ error: 'comm_type, deal_id, contact_id, recipient, and body are required' }, { status: 400 })
    }

    // Find tenant for this user
    const { data: tuRows, error: tuErr } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
    if (tuErr) throw tuErr
    if (!tuRows || tuRows.length === 0) return NextResponse.json({ error: 'No tenant found for user' }, { status: 403 })

    const tenantId = tuRows[0].tenant_id
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .limit(1)
      .single()
    if (tenantErr) throw tenantErr

    // Check usage limits
    if (comm_type === 'email') {
      if ((tenant.comms_email_used || 0) >= (tenant.comms_email_limit || 0)) {
        return NextResponse.json({ error: 'Email limit exceeded' }, { status: 429 })
      }
    }
    if (comm_type === 'sms') {
      if ((tenant.comms_sms_used || 0) >= (tenant.comms_sms_limit || 0)) {
        return NextResponse.json({ error: 'SMS limit exceeded' }, { status: 429 })
      }
    }

    // Ensure tenant has GHL credentials configured
    if (!tenant.ghl_location_id || !tenant.ghl_api_key) {
      // record failed communication attempt
      const { data: commRow, error: commErr } = await supabase
        .from('deal_communications')
        .insert({
          deal_id,
          user_id: user.id,
          comm_type,
          direction: 'outbound',
          recipient: recipient || null,
          subject: subject || null,
          body: body || null,
          status: 'failed',
          ai_generated: !!ai_generated,
          metadata: { ghl: 'not_configured' },
        })
        .select()
        .single()

      return NextResponse.json({ error: 'GHL not connected', connected: false, communication: commRow }, { status: 400 })
    }

    // Call GHL
    let ghlResult: any = null
    let sendStatus = 'sent'
    try {
      if (comm_type === 'sms') {
        ghlResult = await ghlClient.sendSMS(tenant.ghl_location_id, contact_id, body)
      } else if (comm_type === 'email') {
        ghlResult = await ghlClient.sendEmail(tenant.ghl_location_id, contact_id, subject || '', body)
      } else {
        // For calls/notes, just record locally
        ghlResult = null
      }
    } catch (e: any) {
      sendStatus = 'failed'
      ghlResult = { error: e.message || String(e), details: (e as any).body || null }
    }

    // Insert into deal_communications
    const { data: commRow, error: commErr } = await supabase
      .from('deal_communications')
      .insert({
        deal_id,
        user_id: user.id,
        comm_type,
        direction: 'outbound',
        recipient: recipient || null,
        subject: subject || null,
        body: body || null,
        status: sendStatus,
        ai_generated: !!ai_generated,
        metadata: ghlResult ? { ghl: ghlResult } : {},
      })
      .select()
      .single()

    if (commErr) throw commErr

    // Increment usage counter
    try {
      if (comm_type === 'email') {
        await supabase.from('tenants').update({ comms_email_used: (tenant.comms_email_used || 0) + 1, updated_at: new Date().toISOString() }).eq('id', tenant.id)
      }
      if (comm_type === 'sms') {
        await supabase.from('tenants').update({ comms_sms_used: (tenant.comms_sms_used || 0) + 1, updated_at: new Date().toISOString() }).eq('id', tenant.id)
      }
    } catch (e) {
      // Non-fatal
      console.warn('Failed to update tenant usage', e)
    }

    return NextResponse.json({ success: true, communication: commRow, ghl_response: ghlResult })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
