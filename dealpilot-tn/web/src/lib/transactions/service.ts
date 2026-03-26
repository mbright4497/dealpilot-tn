import { autoSetupTransaction } from '@/lib/reva/autoSetupTransaction'
import type { SupabaseClient } from '@supabase/supabase-js'

export type TransactionRecord = {
  id: number
  address: string | null
  client: string | null
  type: string | null
  status: string | null
  user_id: string | null
  closing_date?: string | null
  created_at?: string | null
  updated_at?: string | null
  phase?: string | null
  [key: string]: unknown
}

type CreateTransactionInput = {
  address?: string
  city?: string
  zip?: string
  client?: string
  type?: string
  client_type?: string
  closing_date?: string | null
  phase?: string
}

function toDateOnly(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export async function createTransactionWithSetup(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionRecord> {
  const insertPayload: Record<string, unknown> = {
    address: input.address?.trim() || '',
    client: input.client?.trim() || '',
    type: input.type?.trim() || 'buyer',
    client_type: input.client_type?.trim() || 'buyer',
    property_city: input.city?.trim() || null,
    property_zip: input.zip?.trim() || null,
    closing_date: toDateOnly(input.closing_date),
    phase: input.phase?.trim() || 'intake',
    status: 'active',
    user_id: userId,
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(insertPayload)
    .select('*')
    .single()
  if (error) throw error

  await autoSetupTransaction(data as any, supabase)
  return data as TransactionRecord
}
