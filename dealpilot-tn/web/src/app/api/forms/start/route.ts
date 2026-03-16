import { NextRequest, NextResponse } from 'next/server'
import { getFormsServiceClient } from '@/lib/forms/service'
import { FORM_REGISTRY } from '@/lib/forms/form-registry'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const formId = body?.formId
    const transactionId = body?.transactionId
    if (!formId || !transactionId) {
      return NextResponse.json({ error: 'formId and transactionId required' }, { status: 400 })
    }

    const formDef = FORM_REGISTRY[formId]
    if (!formDef) {
      return NextResponse.json({ error: 'Unknown formId' }, { status: 404 })
    }

    const supabase = getFormsServiceClient()
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    const fieldData: Record<string, unknown> = {}
    const autoFillLog: Array<{ timestamp: string; field: string; source: string; value: unknown }> = []

    if (transaction) {
      for (const [txColumn, fieldId] of Object.entries(formDef.autoFillMap || {})) {
        const value = (transaction as Record<string, unknown>)[txColumn]
        if (value !== undefined && value !== null) {
          fieldData[fieldId] = value
          autoFillLog.push({ timestamp: new Date().toISOString(), field: fieldId, source: txColumn, value })
        }
      }
    }

    const { data: insertData, error: insertError } = await supabase
      .from('form_instances')
      .insert({
        transaction_id: transactionId,
        form_id: formDef.id,
        field_data: fieldData,
        status: 'draft',
        ai_fill_log: autoFillLog,
        current_step: formDef.defaultStepId || formDef.steps[0]?.id || 'select-deal',
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ instance: insertData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
