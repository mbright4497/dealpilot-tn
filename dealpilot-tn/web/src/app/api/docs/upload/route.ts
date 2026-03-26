import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as any
    const transaction_id = form.get('transaction_id') as string | null
    if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const originalName = file.name || `${uuidv4()}.pdf`
    const filename = originalName
    const ext = (filename.split('.').pop() || 'pdf')
    const bucketName = 'deal-documents'
    const storagePath = `deal-${transaction_id || 'unlinked'}/${uuidv4()}.${ext}`

    // ensure bucket exists (create if missing)
    try{
      const { data: bucketList } = await getSupabase().storage.listBuckets()
      const has = (bucketList || []).find((b:any)=>b.name===bucketName)
      if(!has){
        await getSupabase().storage.createBucket(bucketName, { public: false })
      }
    }catch(e){
      // if listing/creation not supported in this SDK/env, continue — upload may still fail and return a clear error
    }

    const { error: uploadErr } = await getSupabase().storage.from(bucketName).upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    // create a signed URL (private bucket) for immediate download preview (short-lived)
    let signedUrl: string | null = null
    try{
      const { data: signed } = await getSupabase().storage.from(bucketName).createSignedUrl(storagePath, 60)
      signedUrl = signed?.signedUrl || null
    }catch(e){ /* ignore signed url failures */ }

    // classification key
    const classification = form.get('classification') as string | null

    // insert into canonical documents table (server-side service role; user_id set to null)
    const { data, error } = await getSupabase().from('documents').insert([{
      deal_id: null,
      transaction_id: transaction_id ? Number(transaction_id) : null,
      name: filename,
      type: file.type || null,
      storage_path: storagePath,
      uploaded_at: new Date().toISOString(),
      user_id: null,
      status_label: 'uploaded',
      rf_number: classification || null,
    }]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ document: data, signed_url: signedUrl })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
