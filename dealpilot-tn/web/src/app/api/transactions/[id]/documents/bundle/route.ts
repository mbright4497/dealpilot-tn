import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOptionalServiceSupabase } from '@/lib/supabase/serviceRole'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'transactions'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const transactionId = Number(params.id)
  if (Number.isNaN(transactionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceSupabase = getOptionalServiceSupabase()
    if (!serviceSupabase) {
      return NextResponse.json({ error: 'Server storage not configured' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('transaction_documents')
      .select('id,display_name,document_type,file_url,file_name,status,sort_order,created_at,user_id,transaction_id')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .in('status', ['reviewed', 'uploaded'])
      .not('file_url', 'is', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'No documents to bundle' }, { status: 404 })

    const mergedPdf = await PDFDocument.create()

    function extractStoragePath(fileUrl: string): string {
      // If it's already a raw path (no http), return as-is
      if (!fileUrl.startsWith('http')) return fileUrl
      // Extract everything after /transactions/ (the bucket name)
      const marker = '/transactions/'
      const idx = fileUrl.indexOf(marker)
      if (idx === -1) return fileUrl
      // Strip query string (signed URLs have ?token=...)
      return fileUrl.slice(idx + marker.length).split('?')[0]
    }

    for (const row of data) {
      const filePath = extractStoragePath(String(row.file_url || ''))
      if (!filePath) continue

      console.log('[bundle] downloading:', filePath)
      const { data: fileData, error: dlError } = await serviceSupabase.storage
        .from(BUCKET)
        .download(filePath)

      if (dlError || !fileData) {
        console.error('[bundle] download failed:', filePath, dlError?.message)
        continue
      }

      const bytes = new Uint8Array(await fileData.arrayBuffer())
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices())
        for (const page of copiedPages) {
          mergedPdf.addPage(page)
        }
      } catch {
        // skip non-PDF or unreadable files
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return NextResponse.json({ error: 'No PDF documents to bundle' }, { status: 404 })
    }

    const mergedBytes = await mergedPdf.save()

    return new NextResponse(mergedBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="closing-package.pdf"',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
