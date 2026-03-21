export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3015'
const OPENCLAW_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || ''

/**
 * POST /api/mission/bridge
 * "Tap on the shoulder" - sends a command from Mission Control to an OpenClaw agent.
 * 1. Looks up agent in agent_registry to get openclaw_agent_id
 * 2. Updates agent_status to 'working'
 * 3. Logs the command in agent_activity_log
 * 4. Fires the command to OpenClaw via POST /hooks/agent
 * 5. Returns the command record
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { agent_id, command, priority } = body as any

    if (!agent_id || !command) {
      return NextResponse.json({ error: 'agent_id and command are required' }, { status: 400 })
    }

    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)

    // 1. Look up agent in registry
    const { data: agent, error: agentErr } = await sb
      .from('agent_registry')
      .select('*')
      .eq('id', agent_id)
      .single()

    if (agentErr || !agent) {
      return NextResponse.json({ error: `Agent '${agent_id}' not found in registry` }, { status: 404 })
    }

    // 2. Log command in activity log
    const { data: logEntry } = await sb.from('agent_activity_log').insert({
      agent_id,
      event_type: 'command',
      source: 'mission_control',
      payload: { command, priority: priority || 'normal', openclaw_agent: agent.openclaw_agent_id }
    }).select().single()

    // 3. Update agent status to working
    await sb.from('agent_status').upsert({
      agent_id,
      status: 'working',
      current_task: command,
      last_command_id: logEntry?.id || null,
      updated_at: new Date().toISOString()
    })

    // 4. Also write to legacy mission_commands table for backward compat
    await sb.from('mission_commands').insert({
      agent_id: agent.display_name,
      command,
      status: 'dispatched'
    })

    // 5. Fire to OpenClaw gateway via /hooks/agent
    let openclawResult: any = null
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (OPENCLAW_SECRET) headers['Authorization'] = `Bearer ${OPENCLAW_SECRET}`

      // If this is Tango (leader), send to main agent who will orchestrate
      // If it's a specific agent, target that agent directly
      const isLeader = agent.is_leader
      const hookPayload = isLeader
        ? {
            message: `[Mission Control Command] ${command}`,
            name: `mc-cmd-${logEntry?.id}`,
            mode: 'now'
          }
        : {
            message: `[Mission Control Command for ${agent.display_name}] ${command}. You are ${agent.display_name}, ${agent.role}. Execute this task directly.`,
            name: `mc-cmd-${agent_id}-${logEntry?.id}`,
            agent: agent.openclaw_agent_id,
            mode: 'now'
          }

      const res = await fetch(`${OPENCLAW_GATEWAY}/hooks/agent`, {
        method: 'POST',
        headers,
        body: JSON.stringify(hookPayload),
        signal: AbortSignal.timeout(5000)
      })
      openclawResult = { status: res.status, ok: res.ok }
    } catch (e: any) {
      // OpenClaw may not be running - that's ok, command is still logged
      openclawResult = { error: e.message, note: 'OpenClaw gateway unreachable - command queued in Supabase' }
    }

    return NextResponse.json({
      ok: true,
      agent: { id: agent.id, name: agent.display_name, openclaw_id: agent.openclaw_agent_id },
      command_id: logEntry?.id,
      openclaw: openclawResult
    }, { status: 201 })

  } catch (e: any) {
    console.error('mission/bridge POST error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}
