import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const dealId = Number(params.id)
  if (Number.isNaN(dealId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load the log (draft/queued/sent/delivered/etc).
    const { data: logs, error: logsErr } = await supabase
      .from('communications')
      .select('*')
      .eq('deal_id', String(dealId))
      .order('created_at', { ascending: false })

    if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 })

    const contactIds = Array.from(
      new Set((logs || [])
        .map((l: any) => l?.contact_id)
        .filter((x: any) => x !== null && x !== undefined),
    ))

    // Roles come from deal_contacts. Names/phones/emails come from contacts.
    let roleMap = new Map<string, string>()
    let contactMap = new Map<string, any>()

    if (contactIds.length) {
      const [{ data: roles, error: rolesErr }, { data: contacts, error: contactsErr }] = await Promise.all([
        supabase.from('deal_contacts').select('contact_id, role').eq('deal_id', dealId).in('contact_id', contactIds),
        supabase.from('contacts').select('id, name, email, phone').in('id', contactIds),
      ])

      if (!rolesErr && Array.isArray(roles)) {
        roleMap = new Map(roles.map((r: any) => [String(r.contact_id), String(r.role)]))
      }

      if (!contactsErr && Array.isArray(contacts)) {
        contactMap = new Map(contacts.map((c: any) => [String(c.id), c]))
      }
    }

    const history = (logs || []).map((l: any) => {
      const cid = l?.contact_id ? String(l.contact_id) : null
      const c = cid ? contactMap.get(cid) : null
      const role = cid ? roleMap.get(cid) : null

      // Communication_log can store message content in different columns depending on sender route.
      const msg = l?.body || l?.message_body || l?.message || null

      return {
        id: String(l.id),
        created_at: l.created_at || l.sent_at || null,
        channel: l.channel || null,
        recipient: l.recipient || null,
        subject: l.subject || null,
        body: msg,
        status: l.status || null,
        delivery_status: l.delivery_status || null,
        delivered_at: l.delivered_at || null,
        contactRole: role || null,
        contactName: c?.name || null,
      }
    })

    return NextResponse.json({ history })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

