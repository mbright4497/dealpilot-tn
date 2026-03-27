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

function splitFullName(full: string): { first: string; last: string | null } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: 'Contact', last: null }
  if (parts.length === 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

/** Maps UI role labels to contacts.type (v2 schema). */
export function roleLabelToContactType(roleLabel: string): string {
  const r = roleLabel.trim().toLowerCase()
  if (r.includes('buyer') && !r.includes('agent')) return 'buyer'
  if (r.includes('seller') && !r.includes('agent')) return 'seller'
  if (r.includes('lender') || r.includes('loan')) return 'lender'
  if (r.includes('title') || r.includes('closing attorney')) return 'title'
  if (r.includes('inspector')) return 'inspector'
  if (r.includes('transaction coordinator') || r === 'tc') return 'agent'
  if (r.includes('agent')) return 'agent'
  return 'other'
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
  const { first, last } = splitFullName(input.name)
  const contactType = roleLabelToContactType(input.roleLabel)

  const tryV2 = {
    owner_id: ownerId,
    type: contactType,
    first_name: first,
    last_name: last,
    email: input.email,
    phone: input.phone,
    company: input.company,
    notes: input.notes,
  }

  const r1 = await supabase.from('contacts').insert(tryV2).select('id').single()
  if (!r1.error && r1.data?.id) return { id: r1.data.id as string }

  const tryName = {
    owner_id: ownerId,
    name: input.name.trim(),
    email: input.email,
    phone: input.phone,
    company: input.company,
    notes: input.notes,
  }
  const r2 = await supabase.from('contacts').insert(tryName).select('id').single()
  if (!r2.error && r2.data?.id) return { id: r2.data.id as string }

  const tryLegacyUser = {
    user_id: ownerId,
    name: input.name.trim(),
    email: input.email,
    phone: input.phone,
    company: input.company,
    notes: input.notes,
  }
  const r3 = await supabase.from('contacts').insert(tryLegacyUser).select('id').single()
  if (!r3.error && r3.data?.id) return { id: r3.data.id as string }

  const msg = r1.error?.message || r2.error?.message || r3.error?.message || 'Could not create contact'
  return { error: msg }
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
  const { first, last } = splitFullName(input.name)
  const base = {
    email: input.email,
    phone: input.phone,
    company: input.company,
    notes: input.notes,
  }

  const withName = { ...base, name: input.name.trim() }
  const u1 = await supabase.from('contacts').update(withName).eq('id', contactId)
  if (!u1.error) return { error: null }

  const withParts = { ...base, first_name: first, last_name: last }
  const u2 = await supabase.from('contacts').update(withParts).eq('id', contactId)
  if (!u2.error) return { error: null }

  return { error: u1.error?.message || u2.error?.message || 'Could not update contact' }
}
