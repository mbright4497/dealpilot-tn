import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { setupTransactionIntelligence } from '@/lib/reva/transactionIntelligence'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await setupTransactionIntelligence(transaction, supabase)

    const { data: updated, error: updatedError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (updatedError) return NextResponse.json({ error: updatedError.message }, { status: 500 })
    return NextResponse.json({ transaction: updated })
  } catch (e: any) {
    console.error('POST /api/transactions/[id]/analyze error', e)
    return NextResponse.json({ error: e.message || 'Analyze failed' }, { status: 500 })
  }
}
