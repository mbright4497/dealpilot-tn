import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase()
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase()
    const dealId = params.id
    if (!dealId) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `deals/${dealId}/contract.pdf`

    const { error: uploadError } = await getSupabase().storage
      .from('contracts')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = getSupabase().storage
      .from('contracts')
      .getPublicUrl(storagePath)

    if (!urlData?.publicUrl) {
      console.error('Failed to generate public URL')
      return NextResponse.json({ error: 'Unable to get public URL' }, { status: 500 })
    }

    const publicUrl = urlData.publicUrl

    const { error: dbError } = await supabase
      .from('contract_store')
      .upsert({
        deal_id: dealId,
        pdf_url: publicUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'deal_id' })

    if (dbError) {
      console.error('DB update error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    console.error('Contract POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase()
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
    const supabase = getSupabase()
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
        .list(`deals/${dealId}`)

      if (files && files.length > 0) {
        const filePaths = files.map((f: { name: string }) => `deals/${dealId}/${f.name}`)
        await getSupabase().storage.from('contracts').remove(filePaths)
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
