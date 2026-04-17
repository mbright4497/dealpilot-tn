import { NextResponse } from 'next/server'
import { assignInspectorToTransaction, TRANSACTION_INSPECTOR_ASSIGNMENT_SELECT } from '@/lib/assignTransactionInspector'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  assertTransactionOwnedByUser,
  parseTransactionIdParam,
} from '@/lib/transactionContactsJsonb'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Assigned rows plus active directory providers not yet on this deal (quick assign). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseTransactionIdParam(params.id)
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const owned = await assertTransactionOwnedByUser(supabase, transactionId, user.id)
    if (owned.error) {
      const status = owned.notFound ? 404 : 500
      return NextResponse.json({ error: owned.error }, { status })
    }

    const { data: assigned, error: assignedError } = await supabase
      .from('transaction_inspectors')
      .select(TRANSACTION_INSPECTOR_ASSIGNMENT_SELECT)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (assignedError) return NextResponse.json({ error: assignedError.message }, { status: 500 })

    const assignedIds = new Set(
      (assigned ?? []).map((a) => a.inspector_id).filter((id): id is string => typeof id === 'string')
    )

    const { data: allActive, error: allErr } = await supabase
      .from('inspectors')
      .select(
        `
        id,
        name,
        company,
        phone,
        email,
        booking_method,
        booking_url,
        specialties,
        notes,
        preferred,
        active,
        category,
        created_at,
        updated_at
      `
      )
      .eq('user_id', user.id)
      .eq('active', true)
      .order('preferred', { ascending: false })
      .order('name', { ascending: true })

    if (allErr) return NextResponse.json({ error: allErr.message }, { status: 500 })

    const available = (allActive ?? []).filter((row) => !assignedIds.has(row.id))

    return NextResponse.json({
      assigned: assigned ?? [],
      available,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not load services'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

type PostBody = {
  inspector_id?: string
  inspection_type?: string
  scheduled_at?: string | null
  notes?: string | null
}

/** Same assignment as POST /inspectors, with duplicate guard (used by quick assign). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const transactionId = parseTransactionIdParam(params.id)
  if (transactionId === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const owned = await assertTransactionOwnedByUser(supabase, transactionId, user.id)
    if (owned.error) {
      const status = owned.notFound ? 404 : 500
      return NextResponse.json({ error: owned.error }, { status })
    }

    const body = (await req.json().catch(() => ({}))) as PostBody
    const inspectorId = typeof body.inspector_id === 'string' ? body.inspector_id.trim() : ''
    if (!inspectorId) return NextResponse.json({ error: 'inspector_id is required' }, { status: 400 })

    const result = await assignInspectorToTransaction(supabase, transactionId, user.id, inspectorId, body, {
      rejectIfDuplicate: true,
      returnWithInspectorJoin: true,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ assignment: result.assignment }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not assign provider'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
