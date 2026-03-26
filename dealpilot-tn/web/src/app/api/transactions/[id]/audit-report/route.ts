import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      error: 'Supabase configuration is incomplete',
      supabaseUrl: supabaseUrl ? supabaseUrl.slice(0, 20) : 'not set',
      serviceRoleKey: serviceRoleKey ? 'set' : 'not set',
      anonKey: anonKey ? 'set' : 'not set',
    }, { status: 500 })
  }

  const supabase = getSupabase() =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  )

  const safeQuery = async (query: () => Promise<{ data: any; error: any }>) => {
    try {
      const { data, error } = await query()
      if (error) throw error
      return data
    } catch (e: any) {
      return { error: String(e) }
    }
  }

  try {
    const dealState = await safeQuery(() => getSupabase().from('deal_state').select('*').eq('deal_id', id).maybeSingle())
    const events = await safeQuery(() => getSupabase().from('deal_events').select('*').eq('deal_id', id))
    const comms = await safeQuery(() => getSupabase().from('communications').select('*').eq('deal_id', id))
    const checklist = await safeQuery(() => getSupabase().from('deal_checklist').select('*').eq('deal_id', id))
    const documents = await safeQuery(() => getSupabase().from('deal_documents').select('*').eq('deal_id', id))
    const auditLogs = await safeQuery(() => getSupabase().from('audit_logs').select('*').eq('deal_id', id))

    const debugBlock = `<div style="font-size:12px;color:#666;margin-bottom:10px">Supabase URL: ${supabaseUrl.slice(0, 20)}${supabaseUrl.length > 20 ? '...' : ''}<br/>Service Role Key: set<br/>Anon Key: ${anonKey ? 'set' : 'not set'}</div>`

    const html = `<!doctype html>
    <html>
    <head><meta charset="utf-8"><title>Audit Report - ${id}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:20px}h1,h2{color:#111}pre{background:#f6f6f6;padding:10px;border-radius:6px;overflow:auto}</style>
    </head>
    <body>
      <h1>Audit Report — Transaction ${id}</h1>
      ${debugBlock}

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
