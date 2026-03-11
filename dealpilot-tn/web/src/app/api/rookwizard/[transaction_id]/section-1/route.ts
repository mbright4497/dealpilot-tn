import { NextResponse } from 'next/server'
import { buildWizardData, getSupabase, updateSection } from '../../helpers'

export async function PUT(
  req: Request,
  { params }: { params: { transaction_id: string } }
) {
  const transactionId = params?.transaction_id
  if (!transactionId) {
    return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 })
  }

  const payload = await req.json()
  const supabase = await getSupabase()
  const result = await updateSection(supabase, transactionId, 'section_1', payload)
  if (result.errors) {
    return NextResponse.json({ error: result.errors.join('. ') }, { status: 400 })
  }

  if (!result.row) {
    return NextResponse.json({ error: 'Unable to reload wizard' }, { status: 500 })
  }

  const response = buildWizardData(result.row)
  return NextResponse.json({ ...response, step: result.step, status: result.status })
}
