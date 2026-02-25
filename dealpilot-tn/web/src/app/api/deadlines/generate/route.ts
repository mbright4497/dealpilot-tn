import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateDeadlines } from '@/lib/deadline-engine'

export async function POST(req: Request){
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const body = await req.json()
  const { deal_id, binding_agreement_date, loan_type } = body
  if(!deal_id) return NextResponse.json({ error: 'missing deal_id' }, { status:400 })

  const deadlines = generateDeadlines(binding_agreement_date, loan_type)

  // save each deadline
  for(const d of deadlines){
    await supabase.from('deal_deadlines').insert({ deal_id, ...d })
  }

  return NextResponse.json({ deadlines })
}
