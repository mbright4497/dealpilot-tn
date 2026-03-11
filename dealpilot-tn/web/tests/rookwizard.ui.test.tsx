import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RookWizard from '@/components/RookWizard'

describe('RookWizard UI flow (smoke)', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  it('saves the first section and completes the wizard', async () => {
    const startResponse = {
      step: 1,
      status: 'initialized',
      wizard_data: {
        section_1: { buyer_name: '', seller_name: '', property_address: '', county: '', deed_instrument_reference: '', included_items: [], remaining_items: [], excluded_items: [], leased_items: [], fuel_adjustment: '' },
        section_2: { purchase_price_numeric: null, purchase_price_written: '', loan_to_value_percent: null, financing_type: '', financial_contingency: '', appraisal_contingency: '' },
        section_2d: { seller_expenses: '', buyer_expenses: '', title_expense_allocation: '', buyer_closing_agency_name: '', buyer_closing_agency_contact: '', buyer_closing_agency_email: '', buyer_closing_agency_phone: '', buyer_deed_names: [] },
        section_3_6: { earnest_money_holder: '', earnest_money_amount: null, earnest_money_due_date: null, closing_date: null, possession_terms: '', inspection_period_end: null, repair_period_end: null, financing_deadline: null, appraisal_deadline: null, greenbelt_intent: '', special_assessments: '', warranties_transfer: '', hoa_fees: '', public_water_notes: '', public_sewer_notes: '' },
      },
    }

    const sectionResponse = {
      step: 5,
      status: 'section-3-6-saved',
      wizard_data: startResponse.wizard_data,
    }

    const completeResponse = {
      transaction_id: 'tx-ui',
      completed_at: new Date().toISOString(),
      summary: { missing_fields: [], next_actions: 'Ready to export with zero gaps.' },
      status: 'complete',
    }

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => startResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => sectionResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => completeResponse })

    global.fetch = fetchMock as any

    render(<RookWizard transactionId="tx-ui" onClose={() => {}} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const saveButton = await screen.findByRole('button', { name: /save & continue/i })
    expect(saveButton).toBeInTheDocument()

    fireEvent.click(saveButton)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: /finalize & export/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    expect(screen.getByText('Ready to export with zero gaps.')).toBeInTheDocument()
  })
})
