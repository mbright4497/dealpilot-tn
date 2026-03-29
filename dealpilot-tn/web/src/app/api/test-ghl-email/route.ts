export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const GHL_MESSAGES_URL = 'https://services.leadconnectorhq.com/conversations/messages'

const CONTACT_ID = 'vcPInSFG1SZYiJQWxj3g'
const LOCATION_ID = 'D1dTmgY5G8SuVs91hoBJ'
const SUBJECT = 'Test from Reva'
const TEXT = 'This is a test email'

function ghlHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
    Version: '2021-07-28',
  }
}

async function postGhlMessage(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch(GHL_MESSAGES_URL, {
    method: 'POST',
    headers: ghlHeaders(apiKey),
    body: JSON.stringify(payload),
  })
  const raw = await res.text()
  let parsed: unknown = null
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { raw }
    }
  }
  return { status: res.status, statusText: res.statusText, body: parsed, rawText: raw }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('ghl_api_key')
      .eq('id', user.id)
      .maybeSingle()

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 })
    }

    const apiKey = String(profile?.ghl_api_key ?? '').trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No ghl_api_key on profile; save your GHL key in settings first.' },
        { status: 400 }
      )
    }

    // User-specified primary payload (message field; type Email)
    const primary = {
      type: 'Email',
      contactId: CONTACT_ID,
      subject: SUBJECT,
      message: TEXT,
      locationId: LOCATION_ID,
    }

    // Three comparison calls (per request): body vs message, +channel, type Email vs email
    const variation_body = {
      type: 'Email',
      contactId: CONTACT_ID,
      subject: SUBJECT,
      body: TEXT,
      locationId: LOCATION_ID,
    }

    const variation_channel = {
      type: 'Email',
      contactId: CONTACT_ID,
      subject: SUBJECT,
      message: TEXT,
      locationId: LOCATION_ID,
      channel: 'Email',
    }

    const variation_typeLowercase = {
      type: 'email',
      contactId: CONTACT_ID,
      subject: SUBJECT,
      message: TEXT,
      locationId: LOCATION_ID,
    }

    const [primaryRes, bodyRes, channelRes, typeLowerRes] = await Promise.all([
      postGhlMessage(apiKey, primary),
      postGhlMessage(apiKey, variation_body),
      postGhlMessage(apiKey, variation_channel),
      postGhlMessage(apiKey, variation_typeLowercase),
    ])

    const fullResponse = (label: string, request: Record<string, unknown>, r: Awaited<ReturnType<typeof postGhlMessage>>) => ({
      label,
      request,
      status: r.status,
      statusText: r.statusText,
      ghlBody: r.body,
      rawText: r.rawText,
    })

    return NextResponse.json({
      endpoint: GHL_MESSAGES_URL,
      contactId: CONTACT_ID,
      locationId: LOCATION_ID,
      /** Step 2: exact payload (message + type Email). */
      primary: fullResponse('primary_message_type_Email', primary, primaryRes),
      /** Three variation probes to compare (body vs message, channel, type casing). */
      variations: [
        fullResponse('body_instead_of_message', variation_body, bodyRes),
        fullResponse('channel_Email_added', variation_channel, channelRes),
        fullResponse('type_email_lowercase', variation_typeLowercase, typeLowerRes),
      ],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
