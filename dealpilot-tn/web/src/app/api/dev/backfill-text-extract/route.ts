import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: docs, error } = await supabase
    .from('transaction_documents')
    .select('id, file_url, display_name')
    .is('extracted_text', null)
    .not('file_url', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!docs || docs.length === 0) return NextResponse.json({ ok: true, processed: 0 })

  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js' as any)) as (buf: Buffer) => Promise<{ text: string }>
  const results: { id: number; name: string; status: string; chars?: number }[] = []

  for (const doc of docs) {
    try {
      const { data: signed, error: signedErr } = await supabase.storage
        .from('transactions')
        .createSignedUrl(doc.file_url as string, 60)

      if (signedErr || !signed?.signedUrl) {
        results.push({ id: doc.id, name: doc.display_name, status: 'signed_url_failed' })
        continue
      }

      const res = await fetch(signed.signedUrl)
      if (!res.ok) {
        results.push({ id: doc.id, name: doc.display_name, status: 'fetch_failed' })
        continue
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      const parsed = await pdfParse(buffer)
      const extractedText = parsed.text || ''

      await supabase
        .from('transaction_documents')
        .update({ extracted_text: extractedText })
        .eq('id', doc.id)

      results.push({ id: doc.id, name: doc.display_name, status: 'ok', chars: extractedText.length })
    } catch (e: unknown) {
      results.push({ id: doc.id, name: doc.display_name, status: 'error: ' + String(e) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
