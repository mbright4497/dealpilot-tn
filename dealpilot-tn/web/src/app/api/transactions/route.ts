import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createTransactionWithSetup } from '@/lib/transactions/service'

export const dynamic = 'force-dynamic'

type TransactionCreatePayload = {
  address?: string
  client?: string
  type?: string
  client_type?: string
  city?: string
  zip?: string
  closing_date?: string | null
  phase?: string
}

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user || null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const q = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ transactions: data ?? [] })
}

export async function POST(req: Request) {
  const body = (await req.json()) as TransactionCreatePayload

  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const transaction = await createTransactionWithSetup(supabase, user.id, body)
    const initialActivity = [
      {
        icon: '🆕',
        description: 'Transaction created',
        timestamp: new Date().toISOString(),
      },
    ]
    await supabase
      .from('transactions')
      .update({ activity_log: initialActivity, updated_at: new Date().toISOString() })
      .eq('id', transaction.id)
      .eq('user_id', user.id)
    return NextResponse.json({ transaction })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Unable to create transaction' }, { status: 500 })
  }
}
