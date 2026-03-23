import { buildDraftTemplate, Contact } from '@/lib/draftTemplate'

describe('buildDraftTemplate', () => {
  const baseTransaction = {
    id: 1,
    address: '123 Main St',
    client: 'Buyer Name',
    type: 'buyer',
    status: 'Active',
    binding: '2024-01-01',
    closing: '2024-02-01',
    contacts: [] as Contact[],
    notes: '',
    timeline: [],
  }

  it('personalizes lender draft body and includes lender email', () => {
    const contacts: Contact[] = [{ role: 'Lender', name: 'Lenny', email: 'lender@example.com' }]
    const template = buildDraftTemplate('lender', baseTransaction, contacts)
    expect(template.subject).toContain('Loan status update for 123 Main St')
    expect(template.body).toContain('Hi Lenny,')
    expect(template.to).toBe('lender@example.com')
  })

  it('falls back to warning placeholder when title contact email missing', () => {
    const template = buildDraftTemplate('title', baseTransaction, [])
    expect(template.to).toBe('[Warning: Title email not on file]')
    expect(template.body).toContain('Hi Title Team,')
  })

  it('collects all party emails for closing reminders', () => {
    const contacts: Contact[] = [
      { role: 'Buyer', name: 'Buyer One', email: 'buyer@example.com' },
      { role: 'Seller', name: 'Seller One', email: 'seller@example.com' },
    ]
    const template = buildDraftTemplate('closing', baseTransaction, contacts)
    expect(template.to).toContain('buyer@example.com')
    expect(template.to).toContain('seller@example.com')
    expect(template.subject).toContain('Closing timeline for 123 Main St')
    expect(template.body).toContain('Hello all,')
  })
})
