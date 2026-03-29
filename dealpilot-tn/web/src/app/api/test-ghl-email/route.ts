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

    const payload = {
      type: 'Email' as const,
      contactId: CONTACT_ID,
      subject: SUBJECT,
      html: TEXT,
      locationId: LOCATION_ID,
    }

    const result = await postGhlMessage(apiKey, payload)

    return NextResponse.json({
      endpoint: GHL_MESSAGES_URL,
      request: payload,
      status: result.status,
      statusText: result.statusText,
      ghlBody: result.body,
      rawText: result.rawText,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
