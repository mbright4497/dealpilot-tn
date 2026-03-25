import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Params = { params: { id: string } }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (url: RequestInfo, options?: RequestInit) => fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

function normalizeDocumentsReceived(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = !!v
  return out
}

export async function GET(_: Request, { params }: Params) {
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const { data, error } = await supabase
    .from('deals')
    .select('documents_received')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents_received: normalizeDocumentsReceived(data?.documents_received) })
}

export async function PATCH(req: Request, { params }: Params) {
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const documents_received = normalizeDocumentsReceived(body?.documents_received)

  const { data, error } = await supabase
    .from('deals')
    .update({ documents_received })
    .eq('id', id)
    .select('id, documents_received')
    .single()

  if (error) {
    console.error('[PATCH /api/deals/[id]/documents-received]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, documents_received: normalizeDocumentsReceived(data?.documents_received) })
}
