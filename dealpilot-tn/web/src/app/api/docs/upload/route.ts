export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

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

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    // ensure bucket exists (create if missing)
    try{
      const { data: bucketList } = await supabase.storage.listBuckets()
      const has = (bucketList || []).find((b:any)=>b.name===bucketName)
      if(!has){
        await supabase.storage.createBucket(bucketName, { public: false })
      }
    }catch(e){
      // if listing/creation not supported in this SDK/env, continue — upload may still fail and return a clear error
    }

    const { error: uploadErr } = await supabase.storage.from(bucketName).upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    // create a signed URL (private bucket) for immediate download preview (short-lived)
    let signedUrl: string | null = null
    try{
      const { data: signed } = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 60)
      signedUrl = signed?.signedUrl || null
    }catch(e){ /* ignore signed url failures */ }

    // classification key
    const classification = form.get('classification') as string | null

    // insert into canonical documents table
    const { data, error } = await supabase.from('documents').insert([{
      deal_id: transaction_id ? Number(transaction_id) : null,
      transaction_id: transaction_id ? Number(transaction_id) : null,
      filename: filename,
      file_type: file.type || null,
      storage_path: storagePath,
      uploaded_at: new Date().toISOString(),
      user_id: user?.id || null,
      uploaded_by: user?.id || null,
      status_label: 'uploaded',
      rf_number: classification || null,
    }]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ document: data, signed_url: signedUrl })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
