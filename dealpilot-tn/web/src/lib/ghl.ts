import fetch from 'node-fetch'

const DEFAULT_BASE = 'https://services.leadconnectorhq.com'

type GhlChannel = 'sms' | 'email'

export interface GhlCredentials {
  apiKey: string
  locationId: string
  baseUrl: string
}

export interface GhlMessageProps {
  channel: GhlChannel
  to: string
  message: string
  subject?: string
  credentials?: Partial<GhlCredentials>
  retries?: number
}

export function resolveGhlConfig(overrides?: Partial<GhlCredentials>) {
  const apiKey = overrides?.apiKey ?? process.env.GHL_API_KEY
  const locationId = overrides?.locationId ?? process.env.GHL_LOCATION_ID
  const baseUrl = overrides?.baseUrl ?? process.env.GHL_BASE_URL ?? DEFAULT_BASE
  if (!apiKey || !locationId) return null
  return { apiKey, locationId, baseUrl }
}

async function sendGhlPayload(params: { creds: GhlCredentials; payload: Record<string, any> }) {
  const url = `${params.creds.baseUrl.replace(/\/+$/, '')}/conversations/messages`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.creds.apiKey}`,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params.payload),
  })

  const text = await res.text()
  let json: any = null
  if (text) {
    try { json = JSON.parse(text) } catch (e) { json = { raw: text } }
  }

  if (!res.ok) {
    const err: any = new Error(`GHL request failed: ${res.status} ${res.statusText}`)
    err.status = res.status
    err.body = json
    throw err
  }

  return json
}

export async function sendViaGhl(opts: GhlMessageProps) {
  const creds = resolveGhlConfig(opts.credentials)
  if (!creds) throw new Error('GHL credentials missing (GHL_API_KEY / GHL_LOCATION_ID)')

  const payload: Record<string, any> = {
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

export class GHLClient {
  apiKey: string | undefined
  baseUrl: string

  constructor() {
    this.apiKey = process.env.GHL_API_KEY
    this.baseUrl = process.env.GHL_BASE_URL || DEFAULT_BASE
  }

  private async _request(method: string, path: string, body?: any) {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    const headers: any = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await res.text()
    let json = null
    try { json = text ? JSON.parse(text) : null } catch (e) { json = { raw: text } }

    if (!res.ok) {
      const err = new Error(`GHL request failed: ${res.status} ${res.statusText}`)
      ;(err as any).status = res.status
      ;(err as any).body = json
      throw err
    }

    return json
  }

  async sendSMS(locationId: string, contactId: string, message: string) {
    const payload = {
      locationId,
      contactId,
      type: 'SMS',
      body: message,
    }
    return this._request('POST', '/conversations/messages', payload)
  }

  async sendEmail(locationId: string, contactId: string, subject: string, body: string) {
    const payload = {
      locationId,
      contactId,
      type: 'Email',
      subject,
      body,
    }
    return this._request('POST', '/conversations/messages', payload)
  }

  async getContact(locationId: string, contactId: string) {
    return this._request('GET', `/contacts/${contactId}?locationId=${encodeURIComponent(locationId)}`)
  }

  async createContact(locationId: string, data: any) {
    const payload = { ...data, locationId }
    return this._request('POST', '/contacts', payload)
  }

  async searchContacts(locationId: string, query: string) {
    return this._request('GET', `/contacts/search?locationId=${encodeURIComponent(locationId)}&query=${encodeURIComponent(query)}`)
  }

  async getConversation(conversationId: string) {
    return this._request('GET', `/conversations/${conversationId}`)
  }
}

export const ghlClient = new GHLClient()
