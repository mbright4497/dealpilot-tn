import { NextResponse } from 'next/server'
import { buildWizardData, fetchWizardRow, getSupabase } from '../helpers'

export async function GET(
  req: Request,
  { params }: { params: { transaction_id: string } }
) {
  const transactionId = params?.transaction_id
  if (!transactionId) {
    return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 })
  }

  const supabase = await getSupabase()
  const row = await fetchWizardRow(supabase, transactionId)
  if (!row) {
    return NextResponse.json({ error: 'Wizard not found' }, { status: 404 })
  }

  return NextResponse.json(buildWizardData(row))
}
