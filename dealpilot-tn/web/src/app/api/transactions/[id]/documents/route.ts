import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOptionalServiceSupabase } from '@/lib/supabase/serviceRole'
import { runDocumentExtraction } from '@/lib/reva/runDocumentExtraction'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'transactions'
/** 25MB — must stay aligned with Supabase bucket file_size_limit */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

function safeFileName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_')
  return base.length ? base.slice(0, 180) : `document_${Date.now()}.pdf`
}

async function attachSignedUrls(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  docs: Record<string, unknown>[]
) {
  const out = []
  for (const d of docs) {
    const path = d.file_url as string | null
    let signed_url: string | null = null
    if (path) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
      signed_url = data?.signedUrl ?? null
    }
    out.push({ ...d, signed_url })
  }
  return out
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
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const withUrls = await attachSignedUrls(supabase, (data || []) as Record<string, unknown>[])
    return NextResponse.json({ documents: withUrls })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const transactionId = Number(params.id)
  if (Number.isNaN(transactionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (txErr || !tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const document_type = String(form.get('document_type') || '').trim()
    let display_name = String(form.get('display_name') || '').trim()
    const is_executed = String(form.get('is_executed') || 'false').toLowerCase() === 'true'

    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (!document_type) return NextResponse.json({ error: 'document_type required' }, { status: 400 })
    if (!display_name && document_type === 'other') display_name = 'Custom document'
    if (!display_name) return NextResponse.json({ error: 'display_name required' }, { status: 400 })

    const origName = file.name || 'upload.pdf'
    const filename = safeFileName(origName.endsWith('.pdf') ? origName : `${origName}.pdf`)
    const storagePath = `${user.id}/${transactionId}/${Date.now()}_${filename}`

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_UPLOAD_BYTES) {
      const mb = (buf.length / (1024 * 1024)).toFixed(1)
      return NextResponse.json(
        {
          error: `This PDF is ${mb}MB. Maximum is 25MB. Try splitting the contract from the addenda.`,
        },
        { status: 413 }
      )
    }
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: file.type || 'application/pdf', upsert: false })

    if (upErr) {
      const msg = String(upErr.message || '')
      if (/too large|maximum|size|413/i.test(msg)) {
        const mb = (buf.length / (1024 * 1024)).toFixed(1)
        return NextResponse.json(
          {
            error: `This PDF is ${mb}MB. Maximum is 25MB. Try splitting the contract from the addenda.`,
          },
          { status: 413 }
        )
      }
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const { count } = await supabase
      .from('transaction_documents')
      .select('*', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .eq('document_type', document_type)

    const { data: sortRow } = await supabase
      .from('transaction_documents')
      .select('sort_order')
      .eq('transaction_id', transactionId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSort = (sortRow?.sort_order ?? -1) + 1
    let version = 1
    if (document_type === 'rf406_counter') {
      version = (count || 0) + 1
    }

    const { data: inserted, error: insErr } = await supabase
      .from('transaction_documents')
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        document_type,
        display_name,
        version,
        file_url: storagePath,
        file_name: filename,
        file_size: buf.length,
        status: 'uploaded',
        is_executed,
        sort_order: nextSort,
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: insErr?.message || 'insert failed' }, { status: 500 })
    }

    const svc = getOptionalServiceSupabase()
    if (svc) {
      void runDocumentExtraction(svc, inserted.id).catch((e) =>
        console.error('[documents POST] async extraction', e)
      )
    } else {
      void runDocumentExtraction(supabase, inserted.id).catch((e) =>
        console.error('[documents POST] extraction (user client)', e)
      )
    }

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
    const { data: txRow } = await supabase
      .from('transactions')
      .select('activity_log')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()
    const existingLog = Array.isArray(txRow?.activity_log) ? txRow.activity_log : []
    const nextLog = [
      ...existingLog,
      {
        icon: '📄',
        description: `${display_name} uploaded`,
        timestamp: new Date().toISOString(),
      },
    ]
    await supabase
      .from('transactions')
      .update({ activity_log: nextLog, updated_at: new Date().toISOString() })
      .eq('id', transactionId)
      .eq('user_id', user.id)

    return NextResponse.json({
      document: { ...inserted, signed_url: signed?.signedUrl ?? null },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
