import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runComplianceChecks } from '@/lib/compliance-auditor'

export async function POST(req: Request){
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!)
  const body = await req.json()
  const { deal_id } = body
  if(!deal_id) return NextResponse.json({ error:'missing deal_id' }, { status:400 })

  const { data: deal } = await supabase.from('deals').select('*').eq('id', deal_id).single()
  const { data: docs } = await supabase.from('deal_documents').select('*').eq('deal_id', deal_id)

  const result = await runComplianceChecks(deal, docs || [])

  const status = result.score >= 80 ? 'pass' : (result.score >= 50 ? 'warn' : 'fail')

  await supabase.from('compliance_checks').insert({ deal_id, score: result.score, status, details: result.issues || [], run_at: new Date().toISOString() })

  return NextResponse.json({ result })
}
