import { NextResponse } from 'next/server'
import { getFormsServiceClient } from '@/lib/forms/service'
import { FORM_REGISTRY } from '@/lib/forms/form-registry'

export const dynamic = 'force-dynamic'

type Params = { params: { instanceId: string } }

export async function POST(_: Request, { params }: Params) {
  try {
    const supabase = getFormsServiceClient()
    const { data, error } = await supabase.from('form_instances').select('*').eq('id', params.instanceId).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Instance not found' }, { status: 404 })

    const formDef = FORM_REGISTRY[data.form_id]
    if (!formDef) return NextResponse.json({ error: 'Unknown form' }, { status: 404 })

    const fieldData = (data.field_data || {}) as Record<string, unknown>
    const missing: string[] = []
    formDef.fields.forEach((field) => {
      if (field.required) {
        const value = fieldData[field.id]
        if (value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0)) {
          missing.push(field.label || field.id)
        }
      }
    })

    const report = { missing_fields: missing, ok: missing.length === 0 }
    await supabase
      .from('form_instances')
      .update({ validation_state: report, updated_at: new Date().toISOString() })
      .eq('id', params.instanceId)

    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
