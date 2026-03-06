"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseMock_1 = require("../helpers/supabaseMock");
let supabaseMock;
jest.mock('../../src/lib/supabase', () => {
    supabaseMock = (0, supabaseMock_1.createSupabaseMock)();
    return {
        supabaseAdmin: {
            from: supabaseMock.fromMock
        }
    };
});
const { createDealEndpoint, getDealEndpoint, updateDealEndpoint, deleteDealEndpoint, listDealsEndpoint } = require('../../src/api/deals');
const getContext = () => {
    if (!supabaseMock) {
        throw new Error('Supabase mock was not initialized');
    }
    return supabaseMock;
};
const baseDealRow = {
    id: 'deal-123',
    title: 'North Ridge Fund',
    buyer_contact: 'buyer-123',
    seller_contact: 'seller-456',
    status: 'pending',
    value: '750000',
    metadata: { office: 'knox' },
    created_at: '2026-01-01T00:00:00Z'
};
const normalizedDeal = {
    id: baseDealRow.id,
    title: baseDealRow.title,
    buyer_contact: baseDealRow.buyer_contact,
    seller_contact: baseDealRow.seller_contact,
    status: baseDealRow.status,
    value: 750000,
    metadata: baseDealRow.metadata,
    created_at: baseDealRow.created_at
};
describe('deals endpoints', () => {
    beforeEach(() => {
        getContext().reset();
    });
    it('creates a deal through Supabase', async () => {
        const payload = {
            title: 'North Ridge Fund',
            status: 'pending',
            value: 750000
        };
        getContext().setDealsSelectResponse({ data: baseDealRow, error: null });
        const deal = await createDealEndpoint(payload);
        expect(getContext().dealsQuery.insert).toHaveBeenCalledWith(payload);
        expect(getContext().dealsQuery.select).toHaveBeenCalledWith('*');
        expect(deal).toEqual(normalizedDeal);
    });
    it('returns a deal by id', async () => {
        getContext().setDealsSelectResponse({ data: baseDealRow, error: null });
        const deal = await getDealEndpoint('deal-123');
        expect(getContext().dealsQuery.select).toHaveBeenCalledWith('*');
        expect(getContext().dealsQuery.eq).toHaveBeenCalledWith('id', 'deal-123');
        expect(deal).toEqual(normalizedDeal);
    });
    it('throws when a deal is missing', async () => {
        getContext().setDealsSelectResponse({ data: null, error: null });
        await expect(getDealEndpoint('deal-unknown')).rejects.toThrow('Deal not found.');
    });
    it('updates a deal atomically', async () => {
        getContext().setDealsSelectResponse({ data: baseDealRow, error: null });
        const updates = { status: 'closed', value: 775000 };
        const deal = await updateDealEndpoint('deal-123', updates);
        expect(getContext().dealsQuery.update).toHaveBeenCalledWith(updates);
        expect(getContext().dealsQuery.eq).toHaveBeenCalledWith('id', 'deal-123');
        expect(deal).toEqual(normalizedDeal);
    });
    it('deletes a deal transactionally', async () => {
        getContext().setDealsSelectResponse({ data: baseDealRow, error: null });
        const deal = await deleteDealEndpoint('deal-123');
        expect(getContext().dealsQuery.delete).toHaveBeenCalled();
        expect(getContext().dealsQuery.eq).toHaveBeenCalledWith('id', 'deal-123');
        expect(deal).toEqual(normalizedDeal);
    });
    it('lists deals with pagination and filters', async () => {
        getContext().setDealsListResponse({ data: [baseDealRow], error: null, count: 1 });
        const result = await listDealsEndpoint({ limit: '5', page: '2', status: 'pending', buyer_contact: 'buyer-123' });
        expect(getContext().dealsQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
        expect(getContext().dealsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
        expect(getContext().dealsQuery.range).toHaveBeenCalledWith(5, 9);
        expect(getContext().dealsQuery.eq).toHaveBeenCalledWith('status', 'pending');
        expect(getContext().dealsQuery.eq).toHaveBeenCalledWith('buyer_contact', 'buyer-123');
        expect(result.data).toEqual([normalizedDeal]);
        expect(result.count).toBe(1);
        expect(result.limit).toBe(5);
        expect(result.page).toBe(2);
    });
});
