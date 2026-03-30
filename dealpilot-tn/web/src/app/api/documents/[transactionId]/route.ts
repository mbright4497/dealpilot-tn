import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: { transactionId: string } }) {
  const supabase = getSupabase()
  const transactionId = Number(params.transactionId)
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // deduplicate by name (keep most recent first)
    const seen = new Set<string>()
    const deduped = [] as any[]
    for (const row of (data || [])) {
      const name = (row && row.name) ? String(row.name) : ''
      if (!name) continue
      if (seen.has(name)) continue
      seen.add(name)
      deduped.push(row)
    }

    return NextResponse.json(deduped)

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { transactionId: string } }) {
  const supabase = getSupabase()
  const transactionId = Number(params.transactionId)

  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.startsWith('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

      const filename = file.name || `${uuidv4()}.pdf`
      const ext = filename.split('.').pop() || 'pdf'
      const id = uuidv4()
      const storagePath = `deal-${transactionId}/${id}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      const { error: uploadError } = await getSupabase().storage
        .from('deal-documents')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

      // create short-lived signed url
      let signedUrl: string | null = null
      try{ const { data: signed } = await getSupabase().storage.from('deal-documents').createSignedUrl(storagePath, 60); signedUrl = signed?.signedUrl || null }catch(e){}

      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert([{
          id: id,
          deal_id: null,
          transaction_id: transactionId,
          user_id: null,
          name: filename,
          type: file.type,
          storage_path: storagePath,
          status_label: 'uploaded',
          extracted_data: {},
          uploaded_at: new Date().toISOString(),
          file_size: buffer.byteLength,
        }])
        .select()

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

      return NextResponse.json(insertData?.[0] || null)
    }

    // If not multipart, try JSON body with base64 data
    const body = await request.json().catch(() => null)
    if (body && body.base64 && body.filename) {
      const { base64, filename } = body as any
      const id = uuidv4()
      const ext = filename.split('.').pop() || 'pdf'
      const storagePath = `deal-${transactionId}/${id}.${ext}`
      const buffer = Buffer.from(base64, 'base64')

      const { error: uploadError } = await getSupabase().storage
        .from('deal-documents')
        .upload(storagePath, buffer, { contentType: body.contentType || 'application/pdf', upsert: false })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

      const { data: publicData } = getSupabase().storage.from('deal-documents').getPublicUrl(storagePath)
      const publicUrl = publicData.publicUrl

      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert([{
          id: id,
          deal_id: null,
          transaction_id: transactionId,
          user_id: null,
          name: filename,
          type: body.contentType || 'application/pdf',
          url: publicUrl,
          metadata: {},
          rf_number: null,
          category: 'other',
          storage_path: storagePath,
          status_label: 'uploaded',
          extracted_data: {},
          uploaded_at: new Date().toISOString(),
          file_size: buffer.byteLength,
        }])
        .select()

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
      return NextResponse.json(insertData?.[0] || null)
    }

    return NextResponse.json({ error: 'Unsupported content type or missing file' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const docId = body?.doc_id || body?.id
    if (!docId) return NextResponse.json({ error: 'doc_id required' }, { status: 400 })

    // fetch document row
    const { data, error: fetchError } = await getSupabase().from('documents').select('*').eq('id', docId).single()
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    const storagePath = data.storage_path

    if (storagePath) {
      const { error: delError } = await getSupabase().storage.from('deal-documents').remove([storagePath])
      if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
    }

    const { error: delRowError } = await getSupabase().from('documents').delete().eq('id', docId)
    if (delRowError) return NextResponse.json({ error: delRowError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
