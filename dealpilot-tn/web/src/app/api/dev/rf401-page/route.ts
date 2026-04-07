import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function parsePageParam(raw: string | null): number {
  const s = raw?.trim() ?? ''
  if (s === '') return 1
  const n = parseInt(s, 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export async function GET(req: NextRequest) {
  const page = parsePageParam(req.nextUrl.searchParams.get('page'))
  const pdfPath = path.join(process.cwd(), 'public', 'forms', 'rf401-blank.pdf')
  const outDir = path.join(process.cwd(), '.rf401-pages')
  const outFile = path.join(outDir, `page-${page}.png`)

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  if (!fs.existsSync(outFile)) {
    // -singlefile writes exactly one PNG as "<prefix>.png" (no zero-padding like page-011.png)
    const outPrefix = path.join(outDir, `page-${page}`)
    await execAsync(
      `pdftoppm -png -r 150 -singlefile -f ${page} -l ${page} "${pdfPath}" "${outPrefix}"`
    )
  }

  if (!fs.existsSync(outFile)) {
    return NextResponse.json({ error: 'Failed to render page' }, { status: 500 })
  }

  const buf = fs.readFileSync(outFile)
  return new NextResponse(buf, { headers: { 'Content-Type': 'image/png' } })
}
