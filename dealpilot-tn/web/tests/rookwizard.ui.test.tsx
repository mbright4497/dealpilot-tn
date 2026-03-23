/**
 * @jest-environment jsdom
 */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RookWizard from '@/components/RookWizard'

describe.skip('RookWizard UI flow (smoke)', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  it('progresses through the premium wizard steps and completes export', async () => {
    const wizardPayload = {
      section_1: { buyer_name: '', seller_name: '', property_address: '', county: '', deed_instrument_reference: '', included_items: [], remaining_items: [], excluded_items: [], leased_items: [], fuel_adjustment: '' },
      section_2: { purchase_price_numeric: null, purchase_price_written: '', loan_to_value_percent: null, financing_type: 'Conventional', financial_contingency: '', appraisal_contingency: '' },
      section_2d: { seller_expenses: '', buyer_expenses: '', title_expense_allocation: '', buyer_closing_agency_name: '', buyer_closing_agency_contact: '', buyer_closing_agency_email: '', buyer_closing_agency_phone: '', buyer_deed_names: [] },
      section_3_6: { earnest_money_holder: '', earnest_money_amount: null, earnest_money_due_date: null, closing_date: null, possession_terms: '', inspection_period_end: null, repair_period_end: null, financing_deadline: null, appraisal_deadline: null, greenbelt_intent: '', special_assessments: '', warranties_transfer: '', hoa_fees: '', public_water_notes: '', public_sewer_notes: '' },
    }

    const startResponse = { step: 1, status: 'initialized', wizard_data: wizardPayload }
    const section1Response = { step: 2, status: 'section-1-saved', wizard_data: wizardPayload }
    const section2Response = { step: 3, status: 'section-2-saved', wizard_data: wizardPayload }
    const section3Response = { step: 5, status: 'section-3-6-saved', wizard_data: wizardPayload }
    const completionResponse = {
      transaction_id: 'tx-ui',
      status: 'complete',
      summary: { missing_fields: [], next_actions: 'Ready to export with zero gaps.' },
    }

    const dealStateResponse = { id: 1, address: '123 Closing Ln', client: 'Pilot Client', status: 'Active' }
    const transactionResponse = { property_address: '123 Closing Ln', buyer_name: 'Buyer A', seller_name: 'Seller B', client: 'Pilot Client' }

    const fetchMock = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/rookwizard/tx-ui/start')) return { ok: true, json: async () => startResponse }
      if (url.includes('/api/deal-state/tx-ui')) return { ok: true, json: async () => dealStateResponse }
      if (url.includes('/api/transactions/tx-ui')) return { ok: true, json: async () => transactionResponse }
      if (url.endsWith('/section-1')) return { ok: true, json: async () => section1Response }
      if (url.endsWith('/section-2')) return { ok: true, json: async () => section2Response }
      if (url.endsWith('/sections-3-6')) return { ok: true, json: async () => section3Response }
      if (url.includes('/complete')) return { ok: true, json: async () => completionResponse }
      return { ok: true, json: async () => ({}) }
    })

    global.fetch = fetchMock as any

    render(<RookWizard transactionId="tx-ui" onClose={() => {}} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/rookwizard/tx-ui/start'), expect.objectContaining({ method: 'POST' })))
    await screen.findAllByText(/Connected deal/i)
    fireEvent.click(screen.getByRole('button', { name: /next: connect deal/i }))

    await screen.findByLabelText(/Buyer legal name/i)
    fireEvent.change(screen.getByLabelText(/Buyer legal name/i), { target: { value: 'Buyer Name' } })
    fireEvent.change(screen.getByLabelText(/Seller legal name/i), { target: { value: 'Seller Name' } })
    fireEvent.click(screen.getByRole('button', { name: /next: verify parties/i }))

    await screen.findByLabelText(/Purchase price/i)
    fireEvent.change(screen.getByLabelText(/Purchase price/i), { target: { value: '500000' } })
    fireEvent.change(screen.getByLabelText(/Closing date/i), { target: { value: '2026-05-30' } })
    fireEvent.change(screen.getByLabelText(/Earnest money amount/i), { target: { value: '5000' } })
    fireEvent.change(screen.getByLabelText(/Earnest money due date/i), { target: { value: '2026-04-15' } })
    fireEvent.click(screen.getByRole('button', { name: /next: fill rf401/i }))

    const finalizeButton = await screen.findByRole('button', { name: /finalize & export/i })
    fireEvent.click(finalizeButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/complete'), expect.anything()))
    expect(await screen.findByText('Ready to export with zero gaps.')).toBeInTheDocument()
  })
})
