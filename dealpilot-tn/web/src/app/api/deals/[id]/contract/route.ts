import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const dealId = params.id
    if (!dealId) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('contract_store')
      .select('extracted, pdf_url')
      .eq('deal_id', dealId)
      .single()
    if (error) {
      console.error('Supabase fetch error:', error)
      return NextResponse.json({ extracted: null, pdfUrl: null })
    }
    return NextResponse.json({
      extracted: data?.extracted || null,
      pdfUrl: data?.pdf_url || null
    })
  } catch (e: any) {
    console.error('Fetch contract error:', e)
    return NextResponse.json({ extracted: null, pdfUrl: null })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { extracted, pdfUrl } = body
    const dealId = params.id
    if (!extracted || !dealId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { error } = await supabase
      .from('contract_store')
      .upsert({
        deal_id: dealId,
        extracted,
        pdf_url: pdfUrl || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'deal_id' })
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
