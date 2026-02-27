import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const dealId = parseInt(params.id)
    if (isNaN(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('deals')
      .select('contract_data, contract_pdf_url')
      .eq('id', dealId)
      .single()
    if (error) {
      console.error('Supabase fetch error:', error)
      return NextResponse.json({ extracted: null, pdfUrl: null })
    }
    return NextResponse.json({
      extracted: data?.contract_data || null,
      pdfUrl: data?.contract_pdf_url || null
    })
  } catch (e: any) {
    console.error('Fetch contract error:', e)
    return NextResponse.json({ extracted: null, pdfUrl: null })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { extracted } = body
    const dealId = parseInt(params.id)
    if (!extracted || isNaN(dealId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const updateData: Record<string, any> = {
      contract_data: extracted,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId)
    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Save contract error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
