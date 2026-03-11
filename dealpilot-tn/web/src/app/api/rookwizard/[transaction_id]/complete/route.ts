import { NextResponse } from 'next/server'
import { completeWizard } from '../../helpers'

export async function POST(
  req: Request,
  { params }: { params: { transaction_id: string } }
) {
  const transactionId = params?.transaction_id
  if (!transactionId) {
    return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 })
  }

  return await completeWizard(req, transactionId)
}
