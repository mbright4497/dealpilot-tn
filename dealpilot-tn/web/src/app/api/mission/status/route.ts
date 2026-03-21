export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

/**
 * GET /api/mission/status
 * Returns the full office state: all agents with their registry info + live status.
 * This is what the Office chessboard polls every few seconds.
 */
export async function GET() {
  try {
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)

    // Join agent_registry with agent_status for full picture
    const { data: agents, error } = await sb
      .from('agent_registry')
      .select(`
        id, display_name, role, openclaw_agent_id, color, is_leader, office_x, office_y, model,
        agent_status ( status, current_task, last_heartbeat, session_key, updated_at )
      `)
      .order('is_leader', { ascending: false })

    if (error) throw error

    // Get recent activity (last 20 events)
    const { data: activity } = await sb
      .from('agent_activity_log')
      .select('id, agent_id, event_type, source, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    // Flatten the join result
    const team = (agents || []).map((a: any) => ({
      id: a.id,
      name: a.display_name,
      role: a.role,
      openclaw_id: a.openclaw_agent_id,
      color: a.color,
      is_leader: a.is_leader,
      office_x: a.office_x,
      office_y: a.office_y,
      model: a.model,
      status: a.agent_status?.status || 'offline',
      current_task: a.agent_status?.current_task || null,
      last_heartbeat: a.agent_status?.last_heartbeat || null,
      session_key: a.agent_status?.session_key || null,
      updated_at: a.agent_status?.updated_at || null
    }))

    return NextResponse.json({ team, activity: activity || [], ts: new Date().toISOString() })
  } catch (e: any) {
    console.error('mission/status GET error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

/**
 * PATCH /api/mission/status
 * Update an agent's status (used by OpenClaw webhook callback)
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { agent_id, status, current_task, session_key } = body as any

    if (!agent_id) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)

    const update: any = { updated_at: new Date().toISOString() }
    if (status) update.status = status
    if (current_task !== undefined) update.current_task = current_task
    if (session_key) update.session_key = session_key
    if (status === 'idle') { update.current_task = null; update.last_heartbeat = new Date().toISOString() }

    const { error } = await sb.from('agent_status').update(update).eq('agent_id', agent_id)
    if (error) throw error

    // Log status change
    await sb.from('agent_activity_log').insert({
      agent_id,
      event_type: 'status_change',
      source: 'openclaw',
      payload: update
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('mission/status PATCH error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}
