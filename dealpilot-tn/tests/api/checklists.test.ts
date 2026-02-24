import { createSupabaseMock, type SupabaseMockContext } from '../helpers/supabaseMock';

let supabaseMock: SupabaseMockContext | undefined;

jest.mock('../../src/lib/supabase', () => {
  supabaseMock = createSupabaseMock();
  return {
    supabaseAdmin: {
      from: supabaseMock!.fromMock
    }
  };
});

const {
  createChecklistEndpoint,
  getChecklistEndpoint,
  updateChecklistEndpoint,
  deleteChecklistEndpoint,
  listChecklistsEndpoint
} = require('../../src/api/checklists');

const getContext = (): SupabaseMockContext => {
  if (!supabaseMock) {
    throw new Error('Supabase mock was not initialized');
  }
  return supabaseMock;
};

const baseChecklistRow = {
  id: 'checklist-123',
  deal_id: 'deal-456',
  title: 'Closing Checklist',
  status: 'active',
  metadata: { owner: 'agent' },
  created_at: '2026-01-01T00:00:00Z'
};

const normalizedChecklist = {
  id: baseChecklistRow.id,
  deal_id: baseChecklistRow.deal_id,
  title: baseChecklistRow.title,
  status: baseChecklistRow.status,
  metadata: baseChecklistRow.metadata,
  created_at: baseChecklistRow.created_at
};

describe('checklists endpoints', () => {
  beforeEach(() => {
    getContext().reset();
  });

  it('creates a checklist through Supabase', async () => {
    const payload = {
      deal_id: 'deal-456',
      title: 'Closing Checklist'
    };

    getContext().setChecklistsSelectResponse({ data: baseChecklistRow, error: null });

    const checklist = await createChecklistEndpoint(payload);

    expect(getContext().checklistsQuery.insert).toHaveBeenCalledWith(payload);
    expect(getContext().checklistsQuery.select).toHaveBeenCalledWith('*');
    expect(checklist).toEqual(normalizedChecklist);
  });

  it('returns a checklist by id', async () => {
    getContext().setChecklistsSelectResponse({ data: baseChecklistRow, error: null });
    const checklist = await getChecklistEndpoint('checklist-123');
    expect(getContext().checklistsQuery.select).toHaveBeenCalledWith('*');
    expect(getContext().checklistsQuery.eq).toHaveBeenCalledWith('id', 'checklist-123');
    expect(checklist).toEqual(normalizedChecklist);
  });

  it('throws when a checklist is missing', async () => {
    getContext().setChecklistsSelectResponse({ data: null, error: null });
    await expect(getChecklistEndpoint('checklist-unknown')).rejects.toThrow('Checklist not found.');
  });

  it('updates a checklist atomically', async () => {
    getContext().setChecklistsSelectResponse({ data: baseChecklistRow, error: null });
    const updates = { status: 'completed' };

    const checklist = await updateChecklistEndpoint('checklist-123', updates);

    expect(getContext().checklistsQuery.update).toHaveBeenCalledWith(updates);
    expect(getContext().checklistsQuery.eq).toHaveBeenCalledWith('id', 'checklist-123');
    expect(checklist).toEqual(normalizedChecklist);
  });

  it('deletes a checklist transactionally', async () => {
    getContext().setChecklistsSelectResponse({ data: baseChecklistRow, error: null });
    const checklist = await deleteChecklistEndpoint('checklist-123');
    expect(getContext().checklistsQuery.delete).toHaveBeenCalled();
    expect(getContext().checklistsQuery.eq).toHaveBeenCalledWith('id', 'checklist-123');
    expect(checklist).toEqual(normalizedChecklist);
  });

  it('lists checklists with pagination and filters', async () => {
    getContext().setChecklistsListResponse({ data: [baseChecklistRow], error: null, count: 1 });

    const result = await listChecklistsEndpoint({ limit: '2', page: '3', deal_id: 'deal-456', status: 'active' });

    expect(getContext().checklistsQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(getContext().checklistsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(getContext().checklistsQuery.range).toHaveBeenCalledWith(4, 5);
    expect(getContext().checklistsQuery.eq).toHaveBeenCalledWith('deal_id', 'deal-456');
    expect(getContext().checklistsQuery.eq).toHaveBeenCalledWith('status', 'active');
    expect(result.data).toEqual([normalizedChecklist]);
    expect(result.count).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.page).toBe(3);
  });
});
