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
    const bucketName = 'documents'
    const storagePath = `documents/docs/${transaction_id || 'unlinked'}/${uuidv4()}.${ext}`

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    // ensure bucket exists (create if missing)
    try{
      const { data: bucketList } = await supabase.storage.listBuckets()
      const has = (bucketList || []).find((b:any)=>b.name===bucketName)
      if(!has){
        await supabase.storage.createBucket(bucketName, { public: true })
      }
    }catch(e){
      // if listing/creation not supported in this SDK/env, continue — upload may still fail and return a clear error
    }

    const { error: uploadErr } = await supabase.storage.from(bucketName).upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    // build public url
    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(storagePath)
    const publicUrl = publicData?.publicUrl || null

    // classification key
    const classification = form.get('classification') as string | null

    // insert into deal_documents
    const { data, error } = await supabase.from('deal_documents').insert([{
      deal_id: transaction_id ? Number(transaction_id) : null,
      doc_key: classification || null,
      file_name: filename,
      file_url: publicUrl,
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
      storage_path: storagePath,
      user_id: user?.id || null,
    }]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ document: data })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
