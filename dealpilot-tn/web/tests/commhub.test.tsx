import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CommHub from '@/components/CommHub'

global.fetch = jest.fn()

describe('CommHub', () => {
  beforeEach(()=>{ (fetch as jest.Mock).mockReset() })
  it('renders and opens compose when contact clicked', async ()=>{
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async ()=>({ communications: [] }) }) // communications
      .mockResolvedValueOnce({ ok: true, json: async ()=>({ grouped: { client: [{ id: '1', name: 'John Doe', email: 'john@example.com', role: 'client' }] } }) }) // hub

    render(<CommHub dealId="123" />)
    await waitFor(()=>expect(fetch).toHaveBeenCalled())
    // contact appears
    expect(await screen.findByText('John Doe')).toBeInTheDocument()
    fireEvent.click(screen.getByText('John Doe'))
    // compose modal opens and recipient prefilled
    expect(await screen.findByPlaceholderText('Recipient name or contact')).toHaveValue('john@example.com')
  })
})
