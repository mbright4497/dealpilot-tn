import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { transactionId: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
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
      const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY! })
      const file = await openai.files.create({
        file: new File([buffer], 'document.pdf', { type: 'application/pdf' }),
        purpose: 'assistants'
      })
      const thread = await openai.beta.threads.create({
        messages: [{
          role: 'user',
          content: 'You are reviewing a Tennessee real estate transaction document. Read this PDF and provide a detailed summary including: all dates, names, addresses, dollar amounts, contingencies, deadlines, loan type, earnest money details, inspection periods, and any special stipulations. Be thorough and specific.',
          attachments: [{ file_id: file.id, tools: [{ type: 'file_search' }] }]
        }]
      })
      await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: process.env.REVA_ASSISTANT_ID_TN!
      })
      const messages = await openai.beta.threads.messages.list(thread.id)
      extractedText = messages.data
        .filter(m => m.role === 'assistant')
        .map(m => m.content.filter(c => c.type === 'text').map(c => (c as any).text.value).join(' '))
        .join('\n')
      await openai.files.del(file.id)
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
