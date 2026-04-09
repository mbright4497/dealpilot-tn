import { NextResponse } from 'next/server'
import ILovePDFApi from '@ilovepdf/ilovepdf-js'
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

    // Generate signed URLs for each document
    const signedUrls: string[] = []
    for (const row of data) {
      const filePath = extractStoragePath(String(row.file_url || ''))
      if (!filePath) continue
      const { data: signed, error: signErr } = await serviceSupabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 60)
      if (signErr || !signed?.signedUrl) {
        console.error('[bundle] signed URL failed:', filePath, signErr?.message)
        continue
      }
      console.log('[bundle] signed URL ok:', filePath)
      signedUrls.push(signed.signedUrl)
    }

    if (signedUrls.length === 0) {
      return NextResponse.json({ error: 'No documents to bundle' }, { status: 404 })
    }

    // Merge via iLovePDF
    const instance = new ILovePDFApi(
      process.env.ILOVEPDF_PUBLIC_KEY!,
      process.env.ILOVEPDF_SECRET_KEY!
    )
    const task = instance.newTask('merge')
    await task.start()

    for (const url of signedUrls) {
      await task.addFile(url)
    }

    await task.process()
    const mergedData = await task.download()

    return new NextResponse(mergedData as any, {
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
