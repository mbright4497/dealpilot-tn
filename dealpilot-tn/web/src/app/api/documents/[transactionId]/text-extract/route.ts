import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { transactionId: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any)
    const transactionId = Number(params.transactionId)
    const url = new URL(request.url)
    const docId = url.searchParams.get('docId')
    if (!docId) return NextResponse.json({ ok: false, error: 'docId required' }, { status: 400 })

    // fetch document row
    const { data: docRow, error: docErr } = await supabase.from('transaction_documents').select('*').eq('id', Number(docId)).single()
    if (docErr) return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 })
    if (!docRow) return NextResponse.json({ ok: false, error: 'document not found' }, { status: 404 })
    if (Number(docRow.transaction_id) !== transactionId) return NextResponse.json({ ok: false, error: 'document does not belong to transaction' }, { status: 403 })

    const storagePath = docRow.file_url as string | null
    if (!storagePath) return NextResponse.json({ ok: false, error: 'document missing storage path' }, { status: 500 })

    // create signed url and fetch bytes
    const { data: signed, error: signedErr } = await supabase.storage.from('transactions').createSignedUrl(storagePath, 3600)
    if (signedErr) return NextResponse.json({ ok: false, error: signedErr.message }, { status: 500 })
    const signedUrl = signed?.signedUrl
    if (!signedUrl) return NextResponse.json({ ok: false, error: 'failed to create signed url' }, { status: 500 })

    const res = await fetch(signedUrl)
    if (!res.ok) return NextResponse.json({ ok: false, error: 'failed to fetch file bytes' }, { status: 502 })
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''
    try{
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      const pdf = await loadingTask.promise
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        extractedText += content.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ') + '\n'
      }
      // persist extracted text to transaction_documents
      await supabase
        .from('transaction_documents')
        .update({ extracted_text: extractedText })
        .eq('id', Number(docId))
    }catch(e:any){
      return NextResponse.json({ ok: false, error: 'pdf parse failed: '+String(e) }, { status: 500 })
    }

    return NextResponse.json({ ok: true, docId, name: docRow.name || docRow.filename || null, storagePath, extractedText })
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 })
  }
}
