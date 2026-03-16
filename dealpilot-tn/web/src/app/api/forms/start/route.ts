import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FORM_REGISTRY from '@/lib/forms/form-registry'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { formId, transactionId } = body
    if (!formId || !transactionId) return NextResponse.json({ error: 'formId and transactionId required' }, { status: 400 })
    const formDef = FORM_REGISTRY[formId]
    if (!formDef) return NextResponse.json({ error: 'Unknown formId' }, { status: 404 })

    const supabase = createServerSupabaseClient()
    // fetch transaction record to auto-fill
    const { data: txData } = await supabase.from('transactions').select('*').eq('id', Number(transactionId)).single()
    const fieldData: Record<string, any> = {}
    const aiFillLog: any[] = []
    if (txData) {
      for (const [txCol, formField] of Object.entries(formDef.autoFillMap || {})) {
        const val = (txData as any)[txCol]
        if (val !== undefined) {
          fieldData[formField] = val
          aiFillLog.push({ ts: new Date().toISOString(), field: formField, source: txCol, value: val, note: 'auto-filled from transaction' })
        }
      }
    }

    const { data, error } = await supabase.from('form_instances').insert([{
      transaction_id: Number(transactionId),
      form_id: formDef.formId,
      form_version: formDef.version,
      field_data: fieldData,
      ai_fill_log: aiFillLog,
      status: 'in_progress',
    }]).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err:any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
