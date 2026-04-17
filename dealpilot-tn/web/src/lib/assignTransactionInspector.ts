import type { SupabaseClient } from '@supabase/supabase-js'

/** Matches GET /api/transactions/[id]/services assigned rows + nested inspector. */
export const TRANSACTION_INSPECTOR_ASSIGNMENT_SELECT = `
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

type PostBody = {
  inspection_type?: string
  scheduled_at?: string | null
  notes?: string | null
}

async function syncInspectorIntoContactsJsonb(
  supabase: SupabaseClient,
  transactionId: number,
  userId: string,
  inspectorId: string
): Promise<void> {
  try {
    const { data: tx } = await supabase.from('transactions').select('contacts').eq('id', transactionId).single()

    const contacts: Record<string, unknown>[] = Array.isArray(tx?.contacts) ? tx.contacts : []

    const { data: inspDetails } = await supabase
      .from('inspectors')
      .select('name, company, phone, email, category')
      .eq('id', inspectorId)
      .single()

    if (inspDetails) {
      const filtered = contacts.filter((c) => c.role !== inspDetails.category)
      filtered.push({
        id: `inspector-${inspectorId}`,
        name: inspDetails.company || inspDetails.name,
        role: inspDetails.category,
        phone: inspDetails.phone || '',
        email: inspDetails.email || '',
        ghl_contact_id: '',
      })
      await supabase.from('transactions').update({ contacts: filtered }).eq('id', transactionId).eq('user_id', userId)
    }
  } catch (syncErr) {
    console.warn('[assignTransactionInspector] failed to sync contact to JSONB:', syncErr)
  }
}

/**
 * Assign a directory inspector to a transaction (insert transaction_inspectors + sync contacts JSONB).
 * Used by /api/transactions/[id]/inspectors and /api/transactions/[id]/services POST.
 */
export async function assignInspectorToTransaction(
  supabase: SupabaseClient,
  transactionId: number,
  userId: string,
  inspectorId: string,
  body: PostBody,
  options?: { rejectIfDuplicate?: boolean; returnWithInspectorJoin?: boolean }
): Promise<
  | { ok: true; assignment: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const rejectIfDuplicate = options?.rejectIfDuplicate === true
  const returnWithInspectorJoin = options?.returnWithInspectorJoin !== false

  const { data: insp, error: inspErr } = await supabase
    .from('inspectors')
    .select('id')
    .eq('id', inspectorId)
    .eq('user_id', userId)
    .maybeSingle()

  if (inspErr) return { ok: false, status: 500, error: inspErr.message }
  if (!insp) return { ok: false, status: 404, error: 'Service provider not found' }

  if (rejectIfDuplicate) {
    const { data: existing } = await supabase
      .from('transaction_inspectors')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('inspector_id', inspectorId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return { ok: false, status: 400, error: 'Provider already assigned' }
    }
  }

  const inspectionType =
    typeof body.inspection_type === 'string' && body.inspection_type.trim()
      ? body.inspection_type.trim()
      : 'home'

  const row = {
    transaction_id: transactionId,
    inspector_id: inspectorId,
    user_id: userId,
    inspection_type: inspectionType,
    scheduled_at: body.scheduled_at ?? null,
    notes: typeof body.notes === 'string' ? body.notes : null,
  }

  const selectClause = returnWithInspectorJoin
    ? TRANSACTION_INSPECTOR_ASSIGNMENT_SELECT.trim()
    : '*'

  const { data, error } = await supabase
    .from('transaction_inspectors')
    .insert(row)
    .select(selectClause)
    .single()

  if (error) return { ok: false, status: 500, error: error.message }
  if (!data || typeof data !== 'object') {
    return { ok: false, status: 500, error: 'Could not assign provider' }
  }

  await syncInspectorIntoContactsJsonb(supabase, transactionId, userId, inspectorId)

  return { ok: true, assignment: data as Record<string, unknown> }
}
