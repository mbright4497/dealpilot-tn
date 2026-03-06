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
const { persistTimelineEvents, getDeadlinesForDeal } = require('../../src/lib/deadline-engine');
const getContext = () => {
    if (!supabaseMock) {
        throw new Error('Supabase mock was not initialized');
    }
    return supabaseMock;
};
describe('persistTimelineEvents', () => {
    beforeEach(() => {
        getContext().reset();
    });
    it('upserts timeline events with Supabase payloads', async () => {
        const events = [
            {
                id: 'event-1',
                name: 'Submit appraisal follow-up',
                due_date: '2026-04-01',
                tags: ['loan-obligation'],
                owner: 'loan-team',
                metadata: { disposition: 'review' },
                description: 'Confirm with appraisal vendor',
                source_form: 'rf401'
            }
        ];
        await persistTimelineEvents('deal-123', events);
        const { upsertMock } = getContext();
        expect(upsertMock).toHaveBeenCalledTimes(1);
        expect(upsertMock).toHaveBeenCalledWith([
            {
                id: 'event-1',
                deal_id: 'deal-123',
                name: 'Submit appraisal follow-up',
                due_date: '2026-04-01',
                category: 'loan-obligation',
                owner: 'loan-team',
                metadata: expect.objectContaining({
                    tags: ['loan-obligation'],
                    disposition: 'review',
                    source_form: 'rf401',
                    description: 'Confirm with appraisal vendor'
                })
            }
        ], { onConflict: 'id' });
    });
    it('skips Supabase upsert when there are no events', async () => {
        await persistTimelineEvents('deal-123', []);
        expect(getContext().upsertMock).not.toHaveBeenCalled();
    });
});
describe('getDeadlinesForDeal', () => {
    beforeEach(() => {
        getContext().reset();
    });
    it('maps persisted rows to timeline events', async () => {
        const storedRow = {
            id: 'deadline-1',
            deal_id: 'deal-123',
            name: 'Submit approval package',
            due_date: '2026-04-01',
            category: 'loan-obligation',
            owner: 'loan-team',
            metadata: {
                tags: ['loan-obligation'],
                description: 'Final underwriting packet',
                source_form: 'rf401',
                reviewer: 'Operations'
            },
            created_at: '2026-03-01T00:00:00Z',
            completed: false
        };
        getContext().setDeadlinesResponse({ data: [storedRow], error: null });
        const events = await getDeadlinesForDeal('deal-123');
        const selectChain = getContext().selectChain;
        expect(selectChain.select).toHaveBeenCalledWith('*');
        expect(selectChain.eq).toHaveBeenCalledWith('deal_id', 'deal-123');
        expect(selectChain.order).toHaveBeenCalledWith('due_date', { ascending: true });
        expect(events).toEqual([
            {
                id: 'deadline-1',
                name: 'Submit approval package',
                due_date: '2026-04-01',
                tags: ['loan-obligation'],
                owner: 'loan-team',
                description: 'Final underwriting packet',
                source_form: 'rf401',
                metadata: expect.objectContaining({ reviewer: 'Operations' })
            }
        ]);
    });
    it('returns an empty array when Supabase returns an error', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        getContext().setDeadlinesResponse({ data: null, error: new Error('boom') });
        const events = await getDeadlinesForDeal('deal-123');
        expect(events).toEqual([]);
        expect(warnSpy).toHaveBeenCalledWith('Failed to read deadlines', expect.any(Error));
        warnSpy.mockRestore();
    });
});
