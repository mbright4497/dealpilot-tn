import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const dealId = params.id
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    // read file as arrayBuffer
    const buf = Buffer.from(await file.arrayBuffer())
    const path = `deals/${dealId}/contract.pdf`
    // upload to storage
    const { error: uploadErr } = await supabase.storage.from('contracts').upload(path, buf, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) {
      console.error('Storage upload error:', uploadErr)
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }
    // get public url
    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(path)
    const publicUrl = urlData.publicUrl
    // update deals table
    const { error: dbErr } = await supabase.from('deals').update({ contract_pdf_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', dealId)
    if (dbErr) {
      console.error('DB update error:', dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }
    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    console.error('contract-upload error:', e)
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}
