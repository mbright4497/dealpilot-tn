import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
const supabase = getSupabase()

export async function GET(request: Request, { params }: { params: { transactionId: string } }) {
  try {
    // dynamic import to avoid bundling pdf-parse test assets during build
    const pdfParse = (await import('pdf-parse'))?.default || (await import('pdf-parse'))
    const transactionId = Number(params.transactionId)
    const url = new URL(request.url)
    const docId = url.searchParams.get('docId')
    if (!docId) return NextResponse.json({ ok: false, error: 'docId required' }, { status: 400 })

    // fetch document row
    const { data: docRow, error: docErr } = await getSupabase().from('documents').select('*').eq('id', docId).single()
    if (docErr) return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 })
    if (!docRow) return NextResponse.json({ ok: false, error: 'document not found' }, { status: 404 })
    if (Number(docRow.transaction_id) !== transactionId) return NextResponse.json({ ok: false, error: 'document does not belong to transaction' }, { status: 403 })

    const storagePath = docRow.storage_path || docRow.path || docRow.storagePath
    if (!storagePath) return NextResponse.json({ ok: false, error: 'document missing storage path' }, { status: 500 })

    // create signed url and fetch bytes
    const { data: signed, error: signedErr } = await getSupabase().storage.from('deal-documents').createSignedUrl(storagePath, 3600)
    if (signedErr) return NextResponse.json({ ok: false, error: signedErr.message }, { status: 500 })
    const signedUrl = signed?.signedUrl
    if (!signedUrl) return NextResponse.json({ ok: false, error: 'failed to create signed url' }, { status: 500 })

    const res = await fetch(signedUrl)
    if (!res.ok) return NextResponse.json({ ok: false, error: 'failed to fetch file bytes' }, { status: 502 })
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // extract text with pdf-parse
    let extractedText = ''
    try{
      const parsed = await pdfParse(buffer)
      extractedText = parsed.text || ''
    }catch(e:any){
      return NextResponse.json({ ok: false, error: 'pdf parse failed: '+String(e) }, { status: 500 })
    }

    return NextResponse.json({ ok: true, docId, name: docRow.name || docRow.filename || null, storagePath, extractedText })
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 })
  }
}
