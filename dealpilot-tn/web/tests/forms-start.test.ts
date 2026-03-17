import { POST } from '@/app/api/forms/start/route'
import { getFormsServiceClient } from '@/lib/forms/service'
import type { NextRequest } from 'next/server'

jest.mock('@/lib/forms/service', () => ({
  getFormsServiceClient: jest.fn(),
}))

const buildTransactionQuery = (result: Record<string, unknown>) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: result, error: null }),
})

const buildInsertQuery = (result: Record<string, unknown>) => ({
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: result, error: null }),
})

describe('forms start endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('auto-fills a new RF401 instance from transaction data', async () => {
    const transactionPayload = {
      id: 'tx-2',
      address: '123 Maple St',
      buyer_names: 'Alice Johnson',
      seller_names: 'Acme Builders LLC',
      purchase_price: 450000,
      earnest_money: 15000,
      closing: '2026-04-30',
      financing_contingency_date: '2026-04-05',
      inspection_end_date: '2026-04-03',
      appraisal_deadline: '2026-04-04',
    }

    const generatedInstance = {
      id: 'instance-abc',
      form_id: 'rf401',
      transaction_id: 'tx-2',
      field_data: {
        property_address: '123 Maple St',
        buyer_names: 'Alice Johnson',
        seller_names: 'Acme Builders LLC',
        sale_price: 450000,
        earnest_money: 15000,
      },
      current_step: 'select-deal',
      status: 'draft',
      ai_fill_log: [
        {
          timestamp: '2026-03-16T12:00:00.000Z',
          source: 'transaction',
          fields: {
            property_address: '123 Maple St',
            sale_price: 450000,
            buyer_names: 'Alice Johnson',
            seller_names: 'Acme Builders LLC',
            earnest_money: 15000,
          },
          details: 'Auto-filled 5 fields from transaction tx-2',
          transactionId: 'tx-2',
          formId: 'rf401',
        },
      ],
      created_at: '2026-03-16T12:00:00.000Z',
      updated_at: '2026-03-16T12:00:00.000Z',
    }

    const transactionQuery = buildTransactionQuery(transactionPayload)
    const insertQuery = buildInsertQuery(generatedInstance)
    ;(getFormsServiceClient as jest.Mock).mockReturnValue({
      from: jest.fn((table: string) => (table === 'transactions' ? transactionQuery : insertQuery)),
    })

    const request = new Request('http://localhost/api/forms/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: 'rf401', transactionId: 'tx-2' }),
    })

    const response = await POST(request as unknown as NextRequest)
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.instance).toMatchObject({
      id: 'instance-abc',
      form_id: 'rf401',
      transaction_id: 'tx-2',
    })
    expect(payload.instance.field_data.property_address).toBe('123 Maple St')
    expect(payload.instance.field_data.sale_price).toBe(450000)
    expect(payload.instance.ai_fill_log).toHaveLength(1)
    expect(payload.instance.ai_fill_log[0].fields.property_address).toBe('123 Maple St')
  })
})
