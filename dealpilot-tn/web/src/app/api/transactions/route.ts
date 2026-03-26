import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { autoSetupTransaction } from '@/lib/reva/autoSetupTransaction'

export const dynamic = 'force-dynamic'

type TransactionRow = {
  closing_date?: string | null
  binding_date?: string | null
  closing?: string | null
  binding?: string | null
  [key: string]: unknown
}

type TransactionInsertPayload = {
  address?: string
  client?: string
  type?: string
  status?: string
  binding?: string
  closing?: string
  notes?: string
  contacts?: string
  purchase_price?: number | null
  earnest_money?: number | null
  seller_names?: string
  buyer_names?: string
  inspection_end_date?: string | null
  financing_contingency_date?: string | null
  special_stipulations?: string
  contract_type?: string
  timeline?: unknown[]
  issues?: unknown[]
  documents?: unknown[]
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (url: RequestInfo, options?: RequestInit) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

export async function GET() {
  // check authenticated user (optional)
  const authSupabase = createServerSupabaseClient()
  const { data: userData } = await authSupabase.auth.getUser()
  const user = userData?.user || null

  let q = supabase.from('transactions').select('*').order('id', { ascending: true })
  if (user) q = q.eq('user_id', user.id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remap DB columns to frontend-friendly keys so TransactionList/Transaction cards
  // can read `closing` and `binding` (the DB stores closing_date and binding_date).
  const payload = Array.isArray(data)
    ? data.map((r: TransactionRow) => ({
        ...r,
        closing: r.closing_date ?? r.closing ?? null,
        binding: r.binding_date ?? r.binding ?? null,
      }))
    : data

  return NextResponse.json(payload)
}

export async function POST(req: Request) {
  const body = (await req.json()) as TransactionInsertPayload

  // get auth user
  const authSupabase = createServerSupabaseClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      address: body.address || '',
      client: body.client || '',
      type: body.type || 'Buyer',
      status: body.status || 'Active',
      binding: body.binding || '',
      closing: body.closing || '',
      notes: body.notes || '',
      contacts: body.contacts || '[]',
      purchase_price: body.purchase_price ?? null,
      earnest_money: body.earnest_money ?? null,
      seller_names: body.seller_names || '',
      buyer_names: body.buyer_names || '',
      inspection_end_date: body.inspection_end_date || null,
      financing_contingency_date: body.financing_contingency_date || null,
      special_stipulations: body.special_stipulations || '',
      contract_type: body.contract_type || 'buyer',
      timeline: body.timeline || [],
      issues: body.issues || [],
      documents: body.documents || [],
      user_id: user?.id || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try {
    const setup = await autoSetupTransaction(authSupabase, data as any)
    return NextResponse.json({ ...data, setup })
  } catch (setupError) {
    console.error('autoSetupTransaction failed (transactions POST)', setupError)
    return NextResponse.json({
      ...data,
      setup: { deadlinesCreated: 0, checklistCreated: 0, error: 'Auto-setup failed' },
    })
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// noop comment to trigger hot-reload in long-running dev servers
