import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const pdfPath = path.join(process.cwd(), 'public', 'forms', 'rf401-blank.pdf')
  const outDir = path.join(process.cwd(), '.rf401-pages')
  const outFile = path.join(outDir, `page-${page}.png`)

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  if (!fs.existsSync(outFile)) {
    await execAsync(
      `pdftoppm -png -r 150 -f ${page} -l ${page} "${pdfPath}" "${path.join(outDir, 'page')}"`
    )
    // pdftoppm names files page-01.png etc — rename to our convention
    const generated = fs.readdirSync(outDir).find(f => f.startsWith('page-') && f.endsWith('.png') && f !== `page-${page}.png`)
    if (generated) fs.renameSync(path.join(outDir, generated), outFile)
  }

  if (!fs.existsSync(outFile)) {
    return NextResponse.json({ error: 'Failed to render page' }, { status: 500 })
  }

  const buf = fs.readFileSync(outFile)
  return new NextResponse(buf, { headers: { 'Content-Type': 'image/png' } })
}
