import { updateSection } from '@/app/api/rookwizard/helpers'
import { UNKNOWN_MARKER, sectionProgress } from '@/lib/rookwizard'

type MockRow = Record<string, any>

function createMockSupabase() {
  const store: Record<string, MockRow> = {}
  return {
    from: jest.fn(() => {
      let lastEqValue: string | undefined
      return {
        upsert: jest.fn(async (payload: MockRow) => {
          const existing = store[payload.transaction_id] || {}
          store[payload.transaction_id] = { ...existing, ...payload }
          return { error: null }
        }),
        select: jest.fn(() => ({
          eq: jest.fn((_: string, value: string) => {
            lastEqValue = value
            return {
              maybeSingle: jest.fn(async () => ({ data: store[lastEqValue ?? ''] ?? null, error: null })),
            }
          }),
        })),
      }
    }),
  }
}

describe('RookWizard helpers (API)', () => {
  it('sanitizes section 1 payload and advances the wizard step', async () => {
    const supabase = createMockSupabase()
    const result = await updateSection(supabase, 'tx-001', 'section_1', {
      buyer_name: 'Taylor Buyer',
      property_address: '',
      included_items: 'Refrigerator, Shelves',
    })

    expect(result.errors).toBeUndefined()
    expect(result.row).toBeDefined()
    expect(result.row.wizard_step).toBe(sectionProgress.section_1.step)
    expect(result.row.wizard_status).toBe(sectionProgress.section_1.status)
    expect(result.row.buyer_name).toBe('Taylor Buyer')
    expect(result.row.property_address).toBe(UNKNOWN_MARKER)
    expect(Array.isArray(result.row.included_items)).toBe(true)
    expect(result.row.included_items).toContain('Refrigerator')
  })
})
