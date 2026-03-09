import { resolveGhlConfig, sendViaGhl } from '@/lib/ghl'

export type CommChannel = 'sms' | 'email'

export interface CommDeliveryOptions {
  channel: CommChannel
  recipient: string
  message: string
  subject?: string
  retries?: number
}

export interface CommDeliveryResult {
  status: 'sent' | 'failed' | 'mock'
  provider: 'ghl' | 'mock'
  provider_response: any
  connected: boolean
}

export async function deliverViaGhl(opts: CommDeliveryOptions): Promise<CommDeliveryResult> {
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
  } catch (err: any) {
    return {
      status: 'failed',
      provider: 'ghl',
      provider_response: { error: err.message || 'unknown', details: err.body || null },
      connected: true,
    }
  }
}
