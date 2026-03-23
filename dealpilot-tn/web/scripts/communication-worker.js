#!/usr/bin/env node
'use strict'

const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')

const DEFAULT_GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const QUEUE_STATUSES = ['queued', 'failed']

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[communication-worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const BATCH_SIZE = Math.max(1, parseInt(process.env.COMMUNICATION_WORKER_BATCH_SIZE || '10', 10))
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.COMMUNICATION_WORKER_MAX_ATTEMPTS || '3', 10))
const DELIVERY_RETRIES = Math.max(1, parseInt(process.env.COMMUNICATION_WORKER_RETRIES || '2', 10))

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log(`[communication-worker] Starting batch (limit=${BATCH_SIZE}, maxAttempts=${MAX_ATTEMPTS})`)
  const { data: queueItems, error } = await supabase
    .from('communication_queue')
    .select('*')
    .in('status', QUEUE_STATUSES)
    .lt('attempts', MAX_ATTEMPTS)
    .order('queued_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) throw error
  if (!queueItems?.length) {
    console.log('[communication-worker] No queued items to process')
    return
  }

  for (const job of queueItems) {
    try {
      await handleJob(job)
    } catch (err) {
      console.error(`[communication-worker] Failed to process job ${job.id}:`, err?.message || err)
    }
  }

  console.log(`[communication-worker] Done processing ${queueItems.length} job(s)`)
}

async function handleJob(job) {
  const attemptsSoFar = job?.attempts ?? 0
  const nextAttempt = attemptsSoFar + 1
  console.log(
    `[communication-worker] Processing ${job.id} (${job.channel}) to ${job.to_address} attempt ${nextAttempt}`
  )

  await supabase
    .from('communication_queue')
    .update({ status: 'sending', attempts: nextAttempt })
    .eq('id', job.id)

  const delivery = await deliverViaGhl({
    channel: job.channel,
    recipient: job.to_address,
    message: job.body,
    subject: job.subject || undefined,
    retries: DELIVERY_RETRIES,
  })

  const finalStatus = delivery.status === 'sent' ? 'sent' : 'failed'
  const now = new Date().toISOString()
  const logUpdates = {
    status: finalStatus,
    provider: delivery.provider,
    provider_response: delivery.provider_response,
    delivery_status: delivery.status,
    attempts: nextAttempt,
    sent_at: now,
    delivered_at: delivery.status === 'sent' ? now : null,
  }

  const queueUpdates = {
    status: finalStatus,
    delivery_status: delivery.status,
    delivered_at: delivery.status === 'sent' ? now : null,
    provider: delivery.provider,
    provider_response: delivery.provider_response,
    sent_at: now,
    last_error: finalStatus === 'failed' ? delivery.provider_response?.error || 'delivery failed' : null,
    attempts: nextAttempt,
  }

  await supabase.from('communication_queue').update(queueUpdates).eq('id', job.id)

  const { error: logError } = await supabase
    .from('communication_log')
    .update(logUpdates)
    .eq('queue_id', job.id)

  if (logError) {
    console.warn(`[communication-worker] Failed to update log for ${job.id}:`, logError.message)
  }

  console.log(`[communication-worker] Job ${job.id} marked ${finalStatus}`)
}

function resolveGhlConfig(overrides = {}) {
  const apiKey = overrides.apiKey || process.env.GHL_API_KEY
  const locationId = overrides.locationId || process.env.GHL_LOCATION_ID
  const baseUrl = overrides.baseUrl || process.env.GHL_BASE_URL || DEFAULT_GHL_BASE_URL
  if (!apiKey || !locationId) return null
  return { apiKey, locationId, baseUrl }
}

async function sendGhlPayload({ creds, payload }) {
  const url = `${creds.baseUrl.replace(/\/+$/, '')}/conversations/messages`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${creds.apiKey}`,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch (err) {
      json = { raw: text }
    }
  }

  if (!res.ok) {
    const err = new Error(`GHL request failed: ${res.status} ${res.statusText}`)
    err.status = res.status
    err.body = json
    throw err
  }

  return json
}

async function sendViaGhl(opts) {
  const creds = resolveGhlConfig(opts.credentials)
  if (!creds) throw new Error('GHL credentials missing (GHL_API_KEY / GHL_LOCATION_ID)')

  const payload = {
    to: opts.to,
    location_id: creds.locationId,
    channel: opts.channel,
  }

  if (opts.channel === 'sms') {
    payload.message = opts.message
  } else {
    payload.body = opts.message
    if (opts.subject) payload.subject = opts.subject
  }

  const retries = Math.max(1, opts.retries ?? 1)
  let attempt = 0
  while (true) {
    try {
      return await sendGhlPayload({ creds, payload })
    } catch (err) {
      attempt += 1
      if (attempt >= retries) {
        throw err
      }
      await new Promise(resolve => setTimeout(resolve, 200 * attempt))
    }
  }
}

async function deliverViaGhl(opts) {
  const config = resolveGhlConfig()
  if (!config) {
    return {
      status: 'mock',
      provider: 'mock',
      provider_response: { error: 'GHL credentials not configured' },
      connected: false,
    }
  }

  try {
    const result = await sendViaGhl({
      channel: opts.channel,
      to: opts.recipient,
      message: opts.message,
      subject: opts.channel === 'email' ? opts.subject : undefined,
      retries: opts.retries ?? 2,
      credentials: config,
    })
    return {
      status: 'sent',
      provider: 'ghl',
      provider_response: result,
      connected: true,
    }
  } catch (err) {
    return {
      status: 'failed',
      provider: 'ghl',
      provider_response: {
        error: err?.message || 'unknown',
        details: err?.body ?? null,
      },
      connected: true,
    }
  }
}

run().catch(err => {
  console.error('[communication-worker] Aborted with error:', err?.message || err)
  process.exit(1)
})
