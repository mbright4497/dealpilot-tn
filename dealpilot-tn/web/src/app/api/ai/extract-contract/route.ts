import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const name = file.name || 'upload'
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let text = ''

    if (name.toLowerCase().endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else if (name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        text = data.text || ''
      } catch (e) {
        // fallback to utf-8
        text = buffer.toString('utf-8')
      }
    } else {
      // attempt to extract as utf-8
      text = buffer.toString('utf-8')
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract enough text from file. Try uploading a .txt or text-based .pdf' }, { status: 400 })
    }

    // Keep existing extraction logic - call OpenAI function-calling or other service
    // For now, return extracted text for downstream processing
    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
