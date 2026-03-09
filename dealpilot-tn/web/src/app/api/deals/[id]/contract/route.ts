import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    global: {
      fetch: (url: any, options: any = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
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

    console.log('Contract GET - dealId:', dealId, 'data:', JSON.stringify(data), 'error:', error)

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
    console.log('Contract PUT - dealId:', dealId, 'pdfUrl:', pdfUrl)

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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const dealId = params.id
    if (!dealId) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
    }

    // Delete contract record from contract_store
    const { error: dbError } = await supabase
      .from('contract_store')
      .delete()
      .eq('deal_id', dealId)

    if (dbError) {
      console.error('Supabase delete error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Also remove the PDF from storage
    try {
      const { data: files } = await supabase
        .storage
        .from('contracts')
        .list(`deal-${dealId}`)

      if (files && files.length > 0) {
        const filePaths = files.map(f => `deal-${dealId}/${f.name}`)
        await supabase.storage.from('contracts').remove(filePaths)
      }
    } catch (_e) {
      // Storage cleanup is best-effort
      console.warn('Storage cleanup failed:', _e)
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Delete contract error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
