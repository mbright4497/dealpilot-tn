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
    const filename = `${uuidv4()}.pdf`
    const path = `documents/${transaction_id || 'unlinked'}/${filename}`

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    const { data: uploadRes, error: uploadErr } = await supabase.storage.from('documents').upload(path, buffer, { contentType: 'application/pdf' })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    // insert documents row
    const classification = form.get('classification') as string | null

    const { data, error } = await supabase.from('documents').insert([{ file_name: filename, path, status: 'uploaded', transaction_id: transaction_id || null, classification: classification || null, user_id: user?.id || null }]).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ document: data })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
