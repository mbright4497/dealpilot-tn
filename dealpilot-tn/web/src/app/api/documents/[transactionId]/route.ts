export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: { transactionId: string } }) {
  const supabase = createServerSupabaseClient({ request, response: undefined as any })
  const transactionId = Number(params.transactionId)
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user || null

    let q = supabase
      .from('documents')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })

    if (user) q = q.eq('user_id', user.id)

    const { data, error } = await q

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { transactionId: string } }) {
  const supabase = createServerSupabaseClient({ request, response: undefined as any })
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

      const { error: uploadError } = await supabase.storage
        .from('deal-documents')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

      // create short-lived signed url
      let signedUrl: string | null = null
      try{ const { data: signed } = await supabase.storage.from('deal-documents').createSignedUrl(storagePath, 60); signedUrl = signed?.signedUrl || null }catch(e){}

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user || null

      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert([{
          id: id,
          deal_id: null,
          transaction_id: transactionId,
          user_id: user?.id || null,
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

      const { error: uploadError } = await supabase.storage
        .from('deal-documents')
        .upload(storagePath, buffer, { contentType: body.contentType || 'application/pdf', upsert: false })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

      const { data: publicData } = supabase.storage.from('deal-documents').getPublicUrl(storagePath)
      const publicUrl = publicData.publicUrl

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user || null

      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert([{
          id: id,
          deal_id: null,
          transaction_id: transactionId,
          user_id: user?.id || null,
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
  const supabase = createServerSupabaseClient({ request, response: undefined as any })
  try {
    const body = await request.json()
    const docId = body?.doc_id || body?.id
    if (!docId) return NextResponse.json({ error: 'doc_id required' }, { status: 400 })

    // fetch document row
    const { data, error: fetchError } = await supabase.from('documents').select('*').eq('id', docId).single()
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    const storagePath = data.storage_path

    if (storagePath) {
      const { error: delError } = await supabase.storage.from('documents').remove([storagePath])
      if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
    }

    const { error: delRowError } = await supabase.from('documents').delete().eq('id', docId)
    if (delRowError) return NextResponse.json({ error: delRowError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
