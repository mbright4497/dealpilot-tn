import { NextResponse } from 'next/server'
import { buildWizardData, ensureWizardRow, getSupabase } from '../../helpers'

export async function POST(
  req: Request,
  { params }: { params: { transaction_id: string } }
) {
  const transactionId = params?.transaction_id
  if (!transactionId) {
    return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 })
  }

  const supabase = await getSupabase()
  const row = await ensureWizardRow(supabase, transactionId)
  return NextResponse.json(buildWizardData(row))
}
