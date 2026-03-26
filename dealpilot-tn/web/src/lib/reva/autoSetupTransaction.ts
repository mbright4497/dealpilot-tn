import { SupabaseClient } from '@supabase/supabase-js'

type TransactionLike = {
  id: string
  user_id?: string | null
  binding_date?: string | null
  binding?: string | null
  closing_date?: string | null
  closing?: string | null
}

type AutoSetupResult = {
  deadlinesCreated: number
  checklistCreated: number
}

const STANDARD_CHECKLIST_ITEMS = [
  'Binding agreement signed',
  'Earnest money deposited',
  'Due diligence period opened',
  'Inspection scheduled',
  'Inspection completed',
  'Appraisal ordered',
  'Appraisal completed',
  'Title search ordered',
  'Title commitment received',
  'Loan approval received',
  'Clear to close received',
  'Closing disclosure sent (3-day rule)',
  'Final walkthrough completed',
  'Closing day confirmed',
  'Keys transferred',
  'Commission disbursed',
] as const

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString().slice(0, 10)
}

function shiftDays(dateOnly: string, days: number): string {
  const dt = new Date(`${dateOnly}T00:00:00.000Z`)
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

async function insertDeadlines(
  supabase: SupabaseClient,
  txId: string,
  userId: string | null,
  closingDate: string
): Promise<number> {
  const standard = [
    { label: 'Due Diligence End', offset: -21 },
    { label: 'Inspection End', offset: -18 },
    { label: 'Appraisal Deadline', offset: -14 },
    { label: 'Title Search', offset: -10 },
    { label: 'Final Walkthrough', offset: -1 },
    { label: 'Closing Day', offset: 0 },
  ]

  const deadlinesDateShape = standard.map((item) => ({
    deal_id: txId,
    name: item.label,
    due_date: shiftDays(closingDate, item.offset),
    category: 'system',
    owner: 'reva',
    completed: false,
    ...(userId ? { user_id: userId } : {}),
    metadata: { generated_by: 'reva_auto_setup', source: 'transaction_create' },
  }))

  const { error: dateShapeError } = await supabase.from('deadlines').insert(deadlinesDateShape)
  if (!dateShapeError) return deadlinesDateShape.length

  const deadlinesTsShape = standard.map((item) => ({
    transaction_id: txId,
    label: item.label,
    due_at: `${shiftDays(closingDate, item.offset)}T00:00:00.000Z`,
    all_day: true,
    status: 'active',
    source: 'system',
    ...(userId ? { owner_id: userId } : {}),
    derived_from: { generated_by: 'reva_auto_setup', source: 'transaction_create' },
  }))

  const { error: tsShapeError } = await supabase.from('deadlines').insert(deadlinesTsShape)
  if (tsShapeError) {
    throw tsShapeError
  }
  return deadlinesTsShape.length
}

async function insertChecklist(
  supabase: SupabaseClient,
  txId: string
): Promise<number> {
  const checklistRows = STANDARD_CHECKLIST_ITEMS.map((label, idx) => ({
    transaction_id: txId,
    title: label,
    status: 'todo',
    due_date: null,
    order_index: idx + 1,
  }))

  const { error } = await supabase.from('deal_milestones').insert(checklistRows)
  if (error) {
    throw error
  }
  return checklistRows.length
}

async function insertMissingBindingFlag(
  supabase: SupabaseClient,
  txId: string
): Promise<void> {
  const { error } = await supabase.from('deal_milestones').insert({
    transaction_id: txId,
    title: 'Binding date needed to generate deadlines',
    status: 'todo',
    due_date: null,
    order_index: 999,
  })

  if (error) throw error
}

export async function autoSetupTransaction(
  supabase: SupabaseClient,
  transaction: TransactionLike
): Promise<AutoSetupResult> {
  const txId = transaction.id
  const userId = transaction.user_id ?? null
  const bindingDate = toDateOnly(transaction.binding_date ?? transaction.binding ?? null)
  const closingDate = toDateOnly(transaction.closing_date ?? transaction.closing ?? null)

  const checklistCreated = await insertChecklist(supabase, txId)
  let deadlinesCreated = 0

  if (closingDate) {
    deadlinesCreated = await insertDeadlines(supabase, txId, userId, closingDate)
  }
  if (!bindingDate) {
    await insertMissingBindingFlag(supabase, txId)
  }

  return { deadlinesCreated, checklistCreated }
}
