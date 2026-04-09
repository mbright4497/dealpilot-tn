import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOptionalServiceSupabase } from '@/lib/supabase/serviceRole'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'transactions'
const ILOVEPDF_BASE = 'https://api.ilovepdf.com/v1'

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

    // Step 1: Authenticate
    const authRes = await fetch(`${ILOVEPDF_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: process.env.ILOVEPDF_PUBLIC_KEY }),
    })
    if (!authRes.ok) {
      const err = await authRes.text()
      console.error('[bundle] iLovePDF auth failed:', err)
      return NextResponse.json({ error: 'iLovePDF auth failed' }, { status: 500 })
    }
    const { token } = await authRes.json()

    // Step 2: Start merge task
    const startRes = await fetch(`${ILOVEPDF_BASE}/start/merge`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!startRes.ok) {
      const err = await startRes.text()
      console.error('[bundle] iLovePDF start failed:', err)
      return NextResponse.json({ error: 'iLovePDF start failed' }, { status: 500 })
    }
    const { server, task } = await startRes.json()

    // Step 3: Download each file from Supabase and upload to iLovePDF
    const uploadedFiles: { server_filename: string; filename: string }[] = []

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

      const bytes = await fileData.arrayBuffer()
      const header = Buffer.from(bytes.slice(0, 10)).toString('hex')
      const rawName = String(row.display_name || row.file_name || filePath.split('/').pop() || `document_${row.id}`)
      const filename = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`
      console.log('[bundle] file header:', filename, header)

      const form = new FormData()
      form.append('task', task)
      form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename)

      const uploadRes = await fetch(`https://${server}/v1/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        console.error('[bundle] iLovePDF upload failed:', filename, err)
        continue
      }
      const { server_filename } = await uploadRes.json()
      console.log('[bundle] uploaded to iLovePDF:', filename, server_filename)
      uploadedFiles.push({ server_filename, filename })
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No documents to bundle' }, { status: 404 })
    }

    // Step 4: Process (merge)
    const processRes = await fetch(`https://${server}/v1/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        tool: 'merge',
        files: uploadedFiles,
      }),
    })
    if (!processRes.ok) {
      const err = await processRes.text()
      console.error('[bundle] iLovePDF process failed:', err)
      return NextResponse.json({ error: 'iLovePDF process failed' }, { status: 500 })
    }

    // Step 5: Download merged PDF
    const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!downloadRes.ok) {
      const err = await downloadRes.text()
      console.error('[bundle] iLovePDF download failed:', err)
      return NextResponse.json({ error: 'iLovePDF download failed' }, { status: 500 })
    }

    const mergedBytes = await downloadRes.arrayBuffer()
    console.log('[bundle] merged PDF size:', mergedBytes.byteLength)

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
