import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { insertContactForOwner, resolveDealUuidForTransaction } from '@/lib/transactionDealContacts'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { transactionId, contacts } = body || {}
    if (!transactionId || !Array.isArray(contacts)) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

    const sb = getSupabase()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const txNum = Number(transactionId)
    if (!Number.isFinite(txNum)) return NextResponse.json({ error: 'invalid transaction id' }, { status: 400 })

    const { dealUuid, error: dealErr } = await resolveDealUuidForTransaction(sb, txNum, user.id)
    if (!dealUuid) {
      return NextResponse.json({ error: dealErr || 'Could not resolve deal for transaction' }, { status: 400 })
    }

    const insertedContacts: unknown[] = []
    for (const c of contacts) {
      if (!c.name || !c.role) continue
      const inserted = await insertContactForOwner(sb, user.id, {
        name: String(c.name),
        email: c.email ? String(c.email) : null,
        phone: c.phone ? String(c.phone) : null,
        company: c.company ? String(c.company) : null,
        notes: null,
        roleLabel: String(c.role),
      })
      if ('error' in inserted) {
        console.error('contact insert error', inserted.error)
        return NextResponse.json({ error: inserted.error }, { status: 500 })
      }
      const { error: e2 } = await sb.from('deal_contacts').insert({
        deal_id: dealUuid,
        contact_id: inserted.id,
        role: String(c.role),
        comm_preference: 'email',
      })
      if (e2) {
        console.error('deal_contacts insert error', e2)
        return NextResponse.json({ error: String(e2.message) }, { status: 500 })
      }
      const { data: row } = await sb.from('contacts').select('*').eq('id', inserted.id).maybeSingle()
      insertedContacts.push(row || { id: inserted.id, name: c.name, email: c.email, phone: c.phone, company: c.company })
    }

    return NextResponse.json({ saved: true, contacts: insertedContacts })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
