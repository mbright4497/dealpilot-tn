import fetch from 'node-fetch'

const DEFAULT_BASE = 'https://services.leadconnectorhq.com'

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
    try { json = text ? JSON.parse(text) : null } catch(e) { json = { raw: text } }

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
