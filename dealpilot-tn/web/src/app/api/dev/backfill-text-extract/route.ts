import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json().catch(() => ({}))
  const docId = body?.docId as number | undefined

  const { data: docs, error } = await supabase
    .from('transaction_documents')
    .select('id, file_url, display_name')
    .is('openai_file_id', null)
    .not('file_url', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!docs || docs.length === 0) {
    return NextResponse.json({ ok: true, message: 'all docs have openai_file_id', remaining: 0 })
  }

  if (!docId) {
    return NextResponse.json({
      ok: true,
      message: 'POST JSON body { "docId": <number> } to backfill one document',
      remaining: docs.length,
      docIds: docs.map((d) => d.id),
    })
  }

  const doc = docs.find((d) => d.id === docId)
  if (!doc) {
    return NextResponse.json(
      { error: 'doc not in backfill set (missing file_url, has openai_file_id, or wrong id)' },
      { status: 404 }
    )
  }

  try {
    const { data: signed, error: signedErr } = await supabase.storage
      .from('transactions')
      .createSignedUrl(doc.file_url as string, 60)

    if (signedErr || !signed?.signedUrl) {
      return NextResponse.json({ error: 'signed_url_failed', details: signedErr?.message }, { status: 502 })
    }

    const res = await fetch(signed.signedUrl)
    if (!res.ok) {
      return NextResponse.json({ error: 'fetch_failed', status: res.status }, { status: 502 })
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY! })
    const file = await openai.files.create({
      file: new File([buffer], 'document.pdf', { type: 'application/pdf' }),
      purpose: 'assistants',
    })
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content:
            'You are reviewing a Tennessee real estate transaction document. Read this PDF and provide a detailed summary including: all dates, names, addresses, dollar amounts, contingencies, deadlines, loan type, earnest money details, inspection periods, and any special stipulations. Be thorough and specific.',
          attachments: [{ file_id: file.id, tools: [{ type: 'file_search' }] }],
        },
      ],
    })
    await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: process.env.REVA_ASSISTANT_ID_TN!,
    })
    const messages = await openai.beta.threads.messages.list(thread.id)
    const extractedText = messages.data
      .filter((m) => m.role === 'assistant')
      .map((m) =>
        m.content.filter((c) => c.type === 'text').map((c) => (c as { text: { value: string } }).text.value).join(' ')
      )
      .join('\n')

    await supabase
      .from('transaction_documents')
      .update({ extracted_text: extractedText, openai_file_id: file.id })
      .eq('id', doc.id)

    return NextResponse.json({
      ok: true,
      id: doc.id,
      name: doc.display_name,
      chars: extractedText.length,
      openai_file_id: file.id,
      remainingAfter: docs.length - 1,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
// Wed Apr  8 12:36:33 EDT 2026
