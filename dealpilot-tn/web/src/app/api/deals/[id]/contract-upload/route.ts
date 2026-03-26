import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
}
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const dealId = params.id
    if (!dealId) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `deals/${dealId}/contract.pdf`

    const { error: uploadError } = await getSupabase().storage
      .from('contracts')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = getSupabase().storage
      .from('contracts')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    console.error('Contract upload error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
