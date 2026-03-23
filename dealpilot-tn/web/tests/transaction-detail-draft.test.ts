import { buildDraftTemplate, type Contact, type Transaction } from '@/lib/draftTemplate'

describe('buildDraftTemplate helper', () => {
  const baseTransaction: Transaction = { id: 1, address: '123 Main St', client: 'Buyer Name', type: 'buyer', status: 'Active' }

  it('resolves lender email regardless of case', () => {
    const contacts: Contact[] = [
      { role: 'LENDER', name: 'Loan Officer', email: 'loan@example.com' },
      { role: 'Buyer', name: 'Buyers Agent', email: 'buyer@example.com' }
    ]
    const template = buildDraftTemplate('lender', baseTransaction, contacts)
    expect(template.to).toContain('loan@example.com')
    expect(template.subject).toContain('Loan status update')
  })

  it('falls back to warning text when title email is missing', () => {
    const contacts: Contact[] = [{ role: 'buyer', name: 'Buyer', email: 'buyer@example.com' }]
    const template = buildDraftTemplate('title', baseTransaction, contacts)
    expect(template.to).toContain('[Warning: Title email not on file]')
  })

  it('deduplicates multiple emails when sending to all parties', () => {
    const contacts: Contact[] = [
      { role: 'buyer', name: 'Buyer', email: 'shared@example.com' },
      { role: 'lender', name: 'Lender', email: 'shared@example.com' },
      { role: 'seller', name: 'Seller', email: 'seller@example.com' }
    ]
    const template = buildDraftTemplate('closing', baseTransaction, contacts)
    const recipients = template.to.split(',').map(r => r.trim()).filter(Boolean)
    expect(recipients).toContain('shared@example.com')
    expect(recipients).toContain('seller@example.com')
    expect(recipients.length).toBe(2)
  })
})
