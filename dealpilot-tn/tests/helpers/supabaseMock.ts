/// <reference types="jest" />

type QueryResult<T = unknown> = {
  data: T | null;
  error: unknown;
};

export interface SupabaseMockContext {
  fromMock: jest.Mock;
  upsertMock: jest.Mock;
  insertMock: jest.Mock;
  selectChain: {
    select: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
  };
  setDeadlinesResponse: (response: QueryResult) => void;
  reset: () => void;
}

export const createSupabaseMock = (): SupabaseMockContext => {
  const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
  const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });

  const selectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn()
  };

  let currentResponse: QueryResult = { data: [], error: null };

  const syncOrderResponse = () => {
    selectChain.order.mockImplementation(() => Promise.resolve(currentResponse));
  };
  syncOrderResponse();

  const setDeadlinesResponse = (response: QueryResult) => {
    currentResponse = response;
    syncOrderResponse();
  };

  const reset = () => {
    insertMock.mockReset().mockResolvedValue({ data: null, error: null });
    upsertMock.mockReset().mockResolvedValue({ data: null, error: null });
    selectChain.select.mockReset().mockReturnThis();
    selectChain.eq.mockReset().mockReturnThis();
    currentResponse = { data: [], error: null };
    syncOrderResponse();
  };

  const fromMock = jest.fn((table: string) => {
    if (table === 'deadlines') {
      return { ...selectChain, upsert: upsertMock };
    }
    if (table === 'activity_log') {
      return { insert: insertMock };
    }
    throw new Error(`Unexpected table name: ${table}`);
  });

  return {
    fromMock,
    upsertMock,
    insertMock,
    selectChain,
    setDeadlinesResponse,
    reset
  };
};
