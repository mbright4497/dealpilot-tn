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
  createDocumentEndpoint,
  getDocumentEndpoint,
  updateDocumentEndpoint,
  deleteDocumentEndpoint,
  listDocumentsEndpoint
} = require('../../src/api/documents');

const getContext = (): SupabaseMockContext => {
  if (!supabaseMock) {
    throw new Error('Supabase mock was not initialized');
  }
  return supabaseMock;
};

const baseDocumentRow = {
  id: 'document-123',
  deal_id: 'deal-456',
  name: 'Inspection Report',
  type: 'inspection',
  url: 'https://example.com/report.pdf',
  metadata: { source: 'rf401' },
  created_at: '2026-01-01T00:00:00Z'
};

const normalizedDocument = {
  id: baseDocumentRow.id,
  deal_id: baseDocumentRow.deal_id,
  name: baseDocumentRow.name,
  type: baseDocumentRow.type,
  url: baseDocumentRow.url,
  metadata: baseDocumentRow.metadata,
  created_at: baseDocumentRow.created_at
};

describe('documents endpoints', () => {
  beforeEach(() => {
    getContext().reset();
  });

  it('creates a document through Supabase', async () => {
    const payload = {
      deal_id: 'deal-456',
      name: 'Inspection Report',
      type: 'inspection'
    };

    getContext().setDocumentsSelectResponse({ data: baseDocumentRow, error: null });

    const document = await createDocumentEndpoint(payload);

    expect(getContext().documentsQuery.insert).toHaveBeenCalledWith(payload);
    expect(getContext().documentsQuery.select).toHaveBeenCalledWith('*');
    expect(document).toEqual(normalizedDocument);
  });

  it('returns a document by id', async () => {
    getContext().setDocumentsSelectResponse({ data: baseDocumentRow, error: null });
    const document = await getDocumentEndpoint('document-123');
    expect(getContext().documentsQuery.select).toHaveBeenCalledWith('*');
    expect(getContext().documentsQuery.eq).toHaveBeenCalledWith('id', 'document-123');
    expect(document).toEqual(normalizedDocument);
  });

  it('throws when a document is missing', async () => {
    getContext().setDocumentsSelectResponse({ data: null, error: null });
    await expect(getDocumentEndpoint('document-unknown')).rejects.toThrow('Document not found.');
  });

  it('updates a document atomically', async () => {
    getContext().setDocumentsSelectResponse({ data: baseDocumentRow, error: null });
    const updates = { type: 'appraisal' };

    const document = await updateDocumentEndpoint('document-123', updates);

    expect(getContext().documentsQuery.update).toHaveBeenCalledWith(updates);
    expect(getContext().documentsQuery.eq).toHaveBeenCalledWith('id', 'document-123');
    expect(document).toEqual(normalizedDocument);
  });

  it('deletes a document transactionally', async () => {
    getContext().setDocumentsSelectResponse({ data: baseDocumentRow, error: null });
    const document = await deleteDocumentEndpoint('document-123');
    expect(getContext().documentsQuery.delete).toHaveBeenCalled();
    expect(getContext().documentsQuery.eq).toHaveBeenCalledWith('id', 'document-123');
    expect(document).toEqual(normalizedDocument);
  });

  it('lists documents with pagination and filters', async () => {
    getContext().setDocumentsListResponse({ data: [baseDocumentRow], error: null, count: 1 });

    const result = await listDocumentsEndpoint({ limit: '4', page: '3', deal_id: 'deal-456', type: 'inspection' });

    expect(getContext().documentsQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(getContext().documentsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(getContext().documentsQuery.range).toHaveBeenCalledWith(8, 11);
    expect(getContext().documentsQuery.eq).toHaveBeenCalledWith('deal_id', 'deal-456');
    expect(getContext().documentsQuery.eq).toHaveBeenCalledWith('type', 'inspection');
    expect(result.data).toEqual([normalizedDocument]);
    expect(result.count).toBe(1);
    expect(result.limit).toBe(4);
    expect(result.page).toBe(3);
  });
});
