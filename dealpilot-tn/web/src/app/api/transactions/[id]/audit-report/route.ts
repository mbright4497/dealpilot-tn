import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: { id: string } }){
  const id = params.id
  try{
    const base = new URL(req.url).origin
    const fetchJson = async (path:string)=>{
      try{ const r = await fetch((base||'') + path, { cache: 'no-store' }); if(!r.ok) return { error: r.statusText }; return await r.json() }catch(e){ return { error: String(e) } }
    }

    const [dealState, events, comms, checklist, documents, auditLogs] = await Promise.all([
      fetchJson(`/api/deal-state/${id}`),
      fetchJson(`/api/deal-events/${id}`),
      fetchJson(`/api/communications/history?dealId=${id}`),
      fetchJson(`/api/deal-checklist?dealId=${id}`),
      fetchJson(`/api/documents/${id}`),
      fetchJson(`/api/audit/logs?dealId=${id}`),
    ])

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
        'Content-Disposition': `attachment; filename="audit-report-${id}.html"`
      }
    })
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function escapeHtml(s:string){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
