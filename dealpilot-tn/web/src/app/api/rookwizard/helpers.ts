import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  intakeApplyFields,
  mergeWizardRow,
  missingFields,
  RookWizardData,
  sectionPaths,
  sectionProgress,
  sanitizeSectionPayload,
  summaryText,
  SectionName,
} from '@/lib/rookwizard'

export const wizardTable = 'rookwizard_transactions'

export async function getSupabase() {
  return createServerSupabaseClient()
}

export async function fetchWizardRow(supabase: any, transactionId: string) {
  const { data, error } = await supabase.from(wizardTable).select('*').eq('transaction_id', transactionId).maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function ensureWizardRow(supabase: any, transactionId: string) {
  const existing = await supabase.from(wizardTable).select('*').eq('transaction_id', transactionId).maybeSingle()
  if (existing.error) {
    throw new Error(existing.error.message)
  }
  if (existing.data) {
    return existing.data
  }
  const { data, error } = await supabase.from(wizardTable).insert({ transaction_id: transactionId }).select('*').single()
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export function buildWizardData(row: any) {
  const data = mergeWizardRow(row)
  return {
    transaction_id: row.transaction_id,
    step: row.wizard_step || 1,
    status: row.wizard_status || 'initialized',
    wizard_data: data,
  }
}

export async function updateSection(
  supabase: any,
  transactionId: string,
  section: keyof typeof sectionProgress,
  payload: Record<string, any>
) {
  const { errors, sanitized } = sanitizeSectionPayload(section, payload)
  if (errors.length) {
    return { errors }
  }

  const now = new Date().toISOString()
  const patch = {
    transaction_id: transactionId,
    ...sanitized,
    wizard_step: sectionProgress[section].step,
    wizard_status: sectionProgress[section].status,
    updated_at: now,
  }

  const { error } = await supabase.from(wizardTable).upsert(patch, { onConflict: 'transaction_id' })
  if (error) {
    return { errors: [error.message] }
  }

  const row = await fetchWizardRow(supabase, transactionId)
  return { row, step: sectionProgress[section].step, status: sectionProgress[section].status, sanitized }
}

export async function completeWizard(req: Request, transactionId: string) {
  const supabase = await getSupabase()
  const row = await fetchWizardRow(supabase, transactionId)
  if (!row) {
    return NextResponse.json({ error: 'RookWizard not initialized' }, { status: 404 })
  }
  if (row.wizard_status === 'complete') {
    const data = mergeWizardRow(row)
    const missing = missingFields(data)
    return NextResponse.json({
      transaction_id: transactionId,
      completed_at: row.completed_at || row.updated_at || new Date().toISOString(),
      summary: { missing_fields: missing, next_actions: summaryText(missing) },
      status: 'complete',
    })
  }

  const data: RookWizardData = mergeWizardRow(row)
  const fields = intakeApplyFields(data)
  const intakeUrl = new URL('/api/intake-apply', req.url)
  const cookies = req.headers.get('cookie')
  const intakeRes = await fetch(intakeUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { cookie: cookies } : {}),
    },
    body: JSON.stringify({ fields, timeline: [] }),
  })

  if (!intakeRes.ok) {
    const message = await intakeRes.text()
    return NextResponse.json({ error: `intake-apply failed: ${message}` }, { status: 500 })
  }

  const completionTime = new Date().toISOString()
  const { error } = await supabase
    .from(wizardTable)
    .update({ wizard_status: 'complete', wizard_step: 5, completed_at: completionTime, updated_at: completionTime })
    .eq('transaction_id', transactionId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const updatedRow = await fetchWizardRow(supabase, transactionId)
  const missing = missingFields(mergeWizardRow(updatedRow))
  return NextResponse.json({
    transaction_id: transactionId,
    completed_at: completionTime,
    summary: { missing_fields: missing, next_actions: summaryText(missing) },
    status: 'complete',
  })
}

export function getSectionNameByPath(path: string): SectionName | null {
  return (Object.keys(sectionPaths) as SectionName[]).find((key) => sectionPaths[key] === path) ?? null
}
