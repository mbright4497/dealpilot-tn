import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/** One contact object stored in public.transactions.contacts (JSONB array). */
export type TransactionJsonContact = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  company: string | null
  notes: string | null
  ghl_contact_id: string | null
  created_at: string
}

export function parseTransactionIdParam(raw: string): number | null {
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null
  return n
}

export async function assertTransactionOwnedByUser(
  supabase: SupabaseClient,
  transactionId: number,
  userId: string
): Promise<{ error: string | null; notFound?: boolean }> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Transaction not found', notFound: true }
  return { error: null }
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function normalizeContactItem(raw: unknown): TransactionJsonContact | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null
  if (!id) return null
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!name) return null
  let role = typeof o.role === 'string' && o.role.trim() ? o.role.trim() : 'other'
  if (!role) role = 'other'
  const created_at =
    typeof o.created_at === 'string' && o.created_at.trim()
      ? o.created_at.trim()
      : new Date().toISOString()
  return {
    id,
    name,
    role,
    phone: strOrNull(o.phone),
    email: strOrNull(o.email),
    company: strOrNull(o.company),
    notes: strOrNull(o.notes),
    ghl_contact_id: strOrNull(o.ghl_contact_id),
    created_at,
  }
}

export function parseContactsJson(raw: unknown): TransactionJsonContact[] {
  if (!Array.isArray(raw)) return []
  const out: TransactionJsonContact[] = []
  for (const item of raw) {
    const c = normalizeContactItem(item)
    if (c) out.push(c)
  }
  return out
}

export function sortContactsByCreatedAt(contacts: TransactionJsonContact[]): TransactionJsonContact[] {
  return [...contacts].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function toApiContactRow(
  transactionId: number,
  userId: string,
  c: TransactionJsonContact
) {
  return {
    id: c.id,
    transaction_id: transactionId,
    user_id: userId,
    role: c.role,
    name: c.name,
    phone: c.phone,
    email: c.email,
    company: c.company,
    notes: c.notes,
    created_at: c.created_at,
  }
}

export async function loadTransactionContacts(
  supabase: SupabaseClient,
  transactionId: number,
  userId: string
): Promise<{ contacts: TransactionJsonContact[]; error: string | null; notFound?: boolean }> {
  const { data, error } = await supabase
    .from('transactions')
    .select('contacts')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { contacts: [], error: error.message }
  if (!data) return { contacts: [], error: 'Transaction not found', notFound: true }
  return {
    contacts: sortContactsByCreatedAt(parseContactsJson(data.contacts)),
    error: null,
  }
}

export async function saveTransactionContacts(
  supabase: SupabaseClient,
  transactionId: number,
  userId: string,
  contacts: TransactionJsonContact[]
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('transactions')
    .update({
      contacts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('user_id', userId)

  return { error: error?.message ?? null }
}

export function newContactFromPostBody(body: Record<string, unknown>): TransactionJsonContact | null {
  const name = String(body?.name || '').trim()
  let role = String(body?.role || '').trim()
  const phone = String(body?.phone || '').trim() || null
  const email = String(body?.email || '').trim() || null
  const company = String(body?.company || '').trim() || null
  const notes = String(body?.notes || '').trim() || null
  if (!name) return null
  if (!role) role = 'other'
  return {
    id: randomUUID(),
    name,
    role,
    phone,
    email,
    company,
    notes,
    ghl_contact_id: null,
    created_at: new Date().toISOString(),
  }
}
