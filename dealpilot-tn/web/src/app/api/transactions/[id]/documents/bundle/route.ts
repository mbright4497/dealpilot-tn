import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOptionalServiceSupabase } from '@/lib/supabase/serviceRole'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    console.log('[bundle] serviceSupabase:', serviceSupabase ? 'client obtained' : 'NULL — SUPABASE_SERVICE_ROLE_KEY missing')
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

    console.log('[bundle] rows fetched:', data.length, data.map(r => ({ id: r.id, status: r.status, file_url: r.file_url })))

    function extractStoragePath(fileUrl: string): string {
      if (!fileUrl.startsWith('http')) return fileUrl
      const marker = '/transactions/'
      const idx = fileUrl.indexOf(marker)
      if (idx === -1) return fileUrl
      return fileUrl.slice(idx + marker.length).split('?')[0]
    }

    const zip = new JSZip()
    let fileCount = 0

    for (const row of data) {
      const filePath = extractStoragePath(String(row.file_url || ''))
      if (!filePath) continue

      console.log('[bundle] downloading:', filePath)
      const { data: fileData, error: dlError } = await serviceSupabase.storage
        .from(BUCKET)
        .download(filePath)

      if (dlError || !fileData) {
        console.error('[bundle] download failed:', filePath, JSON.stringify(dlError))
        continue
      }

      const bytes = new Uint8Array(await fileData.arrayBuffer())
      console.log('[bundle] download ok:', filePath, 'size:', bytes.length)

      // Determine zip entry filename: prefer display_name, then file_name, then last path segment
      const rawName = String(row.display_name || row.file_name || filePath.split('/').pop() || `document_${row.id}`)
      const zipName = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`

      const header = Buffer.from(bytes.slice(0, 10)).toString('hex')
      console.log('[bundle] file header:', zipName, header)
      zip.file(zipName, bytes)
      fileCount++
      console.log('[bundle] added to zip:', zipName)
    }

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No documents to bundle' }, { status: 404 })
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array' })

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="closing-package.zip"',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
