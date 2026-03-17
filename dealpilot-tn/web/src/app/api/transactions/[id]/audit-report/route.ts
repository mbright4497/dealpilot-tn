import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    global: {
      fetch: (url: any, options: any = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })
  }

  const safeQuery = async (query: () => Promise<{ data: any; error: any }>) => {
    try {
      const { data, error } = await query()
      if (error) throw error
      return data
    } catch (_e) {
      return { error: 'table not found' }
    }
  }

  try {
    const dealState = await safeQuery(() => supabase.from('deal_state').select('*').eq('deal_id', id).maybeSingle())
    const events = await safeQuery(() => supabase.from('deal_events').select('*').eq('deal_id', id))
    const comms = await safeQuery(() => supabase.from('communications').select('*').eq('deal_id', id))
    const checklist = await safeQuery(() => supabase.from('deal_checklist').select('*').eq('deal_id', id))
    const documents = await safeQuery(() => supabase.from('deal_documents').select('*').eq('deal_id', id))
    const auditLogs = await safeQuery(() => supabase.from('audit_logs').select('*').eq('deal_id', id))

    const html = `<!doctype html>
    <html>
    <head><meta charset="utf-8"><title>Audit Report - ${id}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:20px}h1,h2{color:#111}pre{background:#f6f6f6;padding:10px;border-radius:6px;overflow:auto}</style>
    </head>
    <body>
      <h1>Audit Report — Transaction ${id}</h1>
      <h2>Summary</h2>
      <pre>${escapeHtml(JSON.stringify(dealState, null, 2))}</pre>

      <h2>Phase Transitions / Events</h2>
      <pre>${escapeHtml(JSON.stringify(events, null, 2))}</pre>

      <h2>Communications</h2>
      <pre>${escapeHtml(JSON.stringify(comms, null, 2))}</pre>

      <h2>Checklist</h2>
      <pre>${escapeHtml(JSON.stringify(checklist, null, 2))}</pre>

      <h2>Documents</h2>
      <pre>${escapeHtml(JSON.stringify(documents, null, 2))}</pre>

      <h2>Audit Logs / Reva Actions</h2>
      <pre>${escapeHtml(JSON.stringify(auditLogs, null, 2))}</pre>

    </body>
    </html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-report-${id}.html"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
