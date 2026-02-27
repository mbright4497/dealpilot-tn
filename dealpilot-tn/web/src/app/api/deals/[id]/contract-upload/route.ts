import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const dealId = parseInt(params.id)
    if (isNaN(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `deals/${dealId}/contract.pdf`

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    const { error: dbError } = await supabase
      .from('deals')
      .update({ contract_pdf_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', dealId)

    if (dbError) {
      console.error('DB update error:', dbError)
      // Still return URL even if DB update fails
    }

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    console.error('Contract upload error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
