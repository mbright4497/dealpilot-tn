import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const BUCKET = 'transactions'

function slugify(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90)
}

function extensionFromName(name?: string | null): string {
  if (!name) return 'pdf'
  const parts = name.split('.')
  const ext = parts[parts.length - 1]?.toLowerCase()
  if (!ext || ext.length > 8) return 'pdf'
  return ext
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const transactionId = Number(params.id)
  if (Number.isNaN(transactionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    if (!data?.length) return NextResponse.json({ count: 0, documents: [] })

    const documents = []
    for (let i = 0; i < data.length; i += 1) {
      const row = data[i]
      const filePath = String(row.file_url || '')
      if (!filePath) continue

      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 60)
      if (signedError || !signedData?.signedUrl) continue

      const seq = String(i + 1).padStart(2, '0')
      const typePart = slugify(String(row.document_type || 'document'))
      const namePart = slugify(String(row.display_name || 'document'))
      const ext = extensionFromName(String(row.file_name || filePath.split('/').pop() || 'pdf'))
      const downloadName = `${seq}_${typePart}_${namePart}.${ext}`

      documents.push({
        id: String(row.id),
        display_name: String(row.display_name || 'Document'),
        document_type: String(row.document_type || 'document'),
        signed_url: signedData.signedUrl,
        file_name: downloadName,
      })
    }

    return NextResponse.json({
      count: documents.length,
      documents,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
