"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("@/app/api/rookwizard/helpers");
const rookwizard_1 = require("@/lib/rookwizard");
function createMockSupabase() {
    const store = {};
    return {
        from: jest.fn(() => {
            let lastEqValue;
            return {
                upsert: jest.fn(async (payload) => {
                    const existing = store[payload.transaction_id] || {};
                    store[payload.transaction_id] = { ...existing, ...payload };
                    return { error: null };
                }),
                select: jest.fn(() => ({
                    eq: jest.fn((_, value) => {
                        lastEqValue = value;
                        return {
                            maybeSingle: jest.fn(async () => ({ data: store[lastEqValue ?? ''] ?? null, error: null })),
                        };
                    }),
                })),
            };
        }),
    };
}
describe('RookWizard helpers (API)', () => {
    it('sanitizes section 1 payload and advances the wizard step', async () => {
        const supabase = createMockSupabase();
        const result = await (0, helpers_1.updateSection)(supabase, 'tx-001', 'section_1', {
            buyer_name: 'Taylor Buyer',
            property_address: '',
            included_items: 'Refrigerator, Shelves',
        });
        expect(result.errors).toBeUndefined();
        expect(result.row).toBeDefined();
        expect(result.row.wizard_step).toBe(rookwizard_1.sectionProgress.section_1.step);
        expect(result.row.wizard_status).toBe(rookwizard_1.sectionProgress.section_1.status);
        expect(result.row.buyer_name).toBe('Taylor Buyer');
        expect(result.row.property_address).toBe(rookwizard_1.UNKNOWN_MARKER);
        expect(Array.isArray(result.row.included_items)).toBe(true);
        expect(result.row.included_items).toContain('Refrigerator');
    });
});
