import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  assertTransactionOwnedByUser,
  parseTransactionIdParam,
} from '@/lib/transactionContactsJsonb'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

    const { data, error } = await supabase
      .from('transaction_inspectors')
      .select(
        `
        id,
        transaction_id,
        inspector_id,
        user_id,
        inspection_type,
        scheduled_at,
        completed_at,
        report_received,
        report_document_id,
        status,
        notes,
        created_at,
        inspectors (
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
        )
      `
      )
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inspectors: data ?? [] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not load inspectors'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

type PostBody = {
  inspector_id?: string
  inspection_type?: string
  scheduled_at?: string | null
  notes?: string | null
}

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

    const { data: insp, error: inspErr } = await supabase
      .from('inspectors')
      .select('id')
      .eq('id', inspectorId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (inspErr) return NextResponse.json({ error: inspErr.message }, { status: 500 })
    if (!insp) return NextResponse.json({ error: 'Service provider not found' }, { status: 404 })

    const inspectionType =
      typeof body.inspection_type === 'string' && body.inspection_type.trim()
        ? body.inspection_type.trim()
        : 'home'

    const row = {
      transaction_id: transactionId,
      inspector_id: inspectorId,
      user_id: user.id,
      inspection_type: inspectionType,
      scheduled_at: body.scheduled_at ?? null,
      notes: typeof body.notes === 'string' ? body.notes : null,
    }

    const { data, error } = await supabase.from('transaction_inspectors').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not assign inspector'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

type PatchBody = {
  id?: string
  status?: string
  scheduled_at?: string | null
  completed_at?: string | null
  report_received?: boolean
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    const body = (await req.json().catch(() => ({}))) as PatchBody
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at
    if (body.completed_at !== undefined) updates.completed_at = body.completed_at
    if (body.report_received !== undefined) updates.report_received = body.report_received

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transaction_inspectors')
      .update(updates)
      .eq('id', id)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ assignment: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not update assignment'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

    let id: string | null = null
    const url = new URL(req.url)
    const fromQuery = url.searchParams.get('id')
    if (fromQuery) id = fromQuery.trim()
    if (!id) {
      const body = (await req.json().catch(() => ({}))) as { id?: string }
      if (typeof body.id === 'string') id = body.id.trim()
    }
    if (!id) return NextResponse.json({ error: 'id is required (query or JSON body)' }, { status: 400 })

    const { data, error } = await supabase
      .from('transaction_inspectors')
      .delete()
      .eq('id', id)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ deleted: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not remove inspector'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
