import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuidString(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

/** Reads deals.id (uuid) from a transactions row when present. */
export function extractDealUuidFromTransactionRow(row: Record<string, unknown>): string | null {
  const keys = ['deal_uuid', 'deal_id', 'linked_deal_id', 'deals_id'] as const
  for (const k of keys) {
    const v = row[k]
    if (isUuidString(v)) return v
  }
  return null
}

/**
 * Resolves public.deals.id (uuid) for a numeric transaction row.
 * Tries: transaction columns, then deals.transaction_id = transactionId (if column exists).
 */
export async function resolveDealUuidForTransaction(
  supabase: SupabaseClient,
  transactionId: number,
  userId: string
): Promise<{ dealUuid: string | null; error: string | null }> {
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (txErr) return { dealUuid: null, error: txErr.message }
  if (!tx) return { dealUuid: null, error: 'Transaction not found' }

  const fromRow = extractDealUuidFromTransactionRow(tx as Record<string, unknown>)
  if (fromRow) return { dealUuid: fromRow, error: null }

  const { data: dealByTx, error: dealErr } = await supabase
    .from('deals')
    .select('id')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  if (!dealErr && dealByTx?.id != null) {
    const id = dealByTx.id as unknown
    if (isUuidString(id)) return { dealUuid: id, error: null }
    if (typeof id === 'string' || typeof id === 'number') return { dealUuid: String(id), error: null }
  }

  return {
    dealUuid: null,
    error:
      'This transaction is not linked to a deal record. Set deal_uuid (or UUID deal_id) on the transaction, or link a deals row with transaction_id.',
  }
}

export function contactDisplayName(c: Record<string, unknown> | null | undefined): string {
  if (!c) return 'Unknown'
  const name = typeof c.name === 'string' ? c.name.trim() : ''
  if (name) return name
  const fn = typeof c.first_name === 'string' ? c.first_name.trim() : ''
  const ln = typeof c.last_name === 'string' ? c.last_name.trim() : ''
  const combined = [fn, ln].filter(Boolean).join(' ').trim()
  return combined || 'Unknown'
}

export async function insertContactForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  input: {
    name: string
    email: string | null
    phone: string | null
    company: string | null
    notes: string | null
    roleLabel: string
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      name: input.name.trim(),
      email: input.email,
      phone: input.phone,
      company: input.company,
      role_type: input.roleLabel,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    return { error: error?.message || 'Could not create contact' }
  }
  return { id: data.id as string }
}

export async function updateContactFields(
  supabase: SupabaseClient,
  contactId: string,
  input: {
    name: string
    email: string | null
    phone: string | null
    company: string | null
    notes: string | null
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contacts')
    .update({
      name: input.name.trim(),
      email: input.email,
      phone: input.phone,
      company: input.company,
    })
    .eq('id', contactId)

  return { error: error?.message || null }
}
