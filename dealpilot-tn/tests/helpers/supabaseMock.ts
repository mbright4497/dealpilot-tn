/// <reference types="jest" />

type QueryResult<T = unknown> = {
  data: T | null;
  error: unknown;
  count?: number | null;
};

interface QueryChain {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  then: jest.Mock;
  catch: jest.Mock;
}

const createTableQueryContext = () => {
  let selectResponse: QueryResult = { data: null, error: null };
  let rangeResponse: QueryResult = { data: [], error: null, count: 0 };
  let insertResponse: QueryResult = { data: null, error: null };

  const query: any = {};
  query.insert = jest.fn().mockReturnThis();
  query.update = jest.fn().mockReturnThis();
  query.delete = jest.fn().mockReturnThis();
  query.select = jest.fn().mockReturnThis();
  query.eq = jest.fn().mockReturnThis();
  query.order = jest.fn().mockReturnThis();
  query.range = jest.fn().mockImplementation(() => Promise.resolve(rangeResponse));
  query.single = jest.fn().mockImplementation(() => Promise.resolve(selectResponse));
  query.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(selectResponse));
  query.then = jest.fn().mockImplementation((resolve: any) => Promise.resolve(insertResponse).then(resolve));
  query.catch = jest.fn().mockImplementation((reject: any) => Promise.resolve(insertResponse).catch(reject));

  const setSelectResponse = (response: QueryResult) => {
    selectResponse = response;
  };

  const setRangeResponse = (response: QueryResult) => {
    rangeResponse = response;
  };

  const setInsertResponse = (response: QueryResult) => {
    insertResponse = response;
  };

  const reset = () => {
    query.insert.mockReset().mockReturnThis();
    query.update.mockReset().mockReturnThis();
    query.delete.mockReset().mockReturnThis();
    query.select.mockReset().mockReturnThis();
    query.eq.mockReset().mockReturnThis();
    query.order.mockReset().mockReturnThis();
    query.range.mockReset().mockImplementation(() => Promise.resolve(rangeResponse));
    query.single.mockReset().mockImplementation(() => Promise.resolve(selectResponse));
    query.maybeSingle.mockReset().mockImplementation(() => Promise.resolve(selectResponse));
    query.then.mockReset().mockImplementation((resolve: any) => Promise.resolve(insertResponse).then(resolve));
    query.catch.mockReset().mockImplementation((reject: any) => Promise.resolve(insertResponse).catch(reject));
    setSelectResponse({ data: null, error: null });
    setRangeResponse({ data: [], error: null, count: 0 });
    setInsertResponse({ data: null, error: null });
  };

  return {
    query,
    setSelectResponse,
    setRangeResponse,
    setInsertResponse,
    reset
  };
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
  dealsQuery: QueryChain;
  setDealsSelectResponse: (response: QueryResult) => void;
  setDealsListResponse: (response: QueryResult) => void;
  contactsQuery: QueryChain;
  setContactsSelectResponse: (response: QueryResult) => void;
  setContactsListResponse: (response: QueryResult) => void;
  documentsQuery: QueryChain;
  setDocumentsSelectResponse: (response: QueryResult) => void;
  setDocumentsListResponse: (response: QueryResult) => void;
  checklistsQuery: QueryChain;
  setChecklistsSelectResponse: (response: QueryResult) => void;
  setChecklistsListResponse: (response: QueryResult) => void;
  checklistItemsQuery: QueryChain;
  setChecklistItemsSelectResponse: (response: QueryResult) => void;
  setChecklistItemsListResponse: (response: QueryResult) => void;
  activityLogQuery: QueryChain;
  setActivityLogSelectResponse: (response: QueryResult) => void;
  setActivityLogListResponse: (response: QueryResult) => void;
  setActivityLogInsertResponse: (response: QueryResult) => void;
}

const createDealQuery = () => createTableQueryContext();

export const createSupabaseMock = (): SupabaseMockContext => {
  const { query: dealsQuery, setSelectResponse: setDealsSelectResponse, setRangeResponse: setDealsRangeResponse, reset: resetDealQuery } =
    createDealQuery();
  const { query: contactsQuery, setSelectResponse: setContactsSelectResponse, setRangeResponse: setContactsRangeResponse, reset: resetContactsQuery } =
    createTableQueryContext();
  const { query: documentsQuery, setSelectResponse: setDocumentsSelectResponse, setRangeResponse: setDocumentsRangeResponse, reset: resetDocumentsQuery } =
    createTableQueryContext();
  const { query: checklistsQuery, setSelectResponse: setChecklistsSelectResponse, setRangeResponse: setChecklistsRangeResponse, reset: resetChecklistsQuery } =
    createTableQueryContext();
  const { query: checklistItemsQuery, setSelectResponse: setChecklistItemsSelectResponse, setRangeResponse: setChecklistItemsRangeResponse, reset: resetChecklistItemsQuery } =
    createTableQueryContext();
  const {
    query: activityLogQuery,
    setSelectResponse: setActivityLogSelectResponse,
    setRangeResponse: setActivityLogRangeResponse,
    setInsertResponse: setActivityLogInsertResponse,
    reset: resetActivityLogQuery
  } = createTableQueryContext();

  const insertMock = activityLogQuery.insert;
  const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });

  const selectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn()
  };

  let deadlinesResponse: QueryResult = { data: [], error: null };

  const syncOrderResponse = () => {
    selectChain.order.mockImplementation(() => Promise.resolve(deadlinesResponse));
  };
  syncOrderResponse();

  const fromMock = jest.fn((table: string) => {
    if (table === 'deadlines') {
      return { ...selectChain, upsert: upsertMock };
    }
    if (table === 'activity_log') {
      return activityLogQuery;
    }
    if (table === 'deals') {
      return dealsQuery;
    }
    if (table === 'contacts') {
      return contactsQuery;
    }
    if (table === 'documents') {
      return documentsQuery;
    }
    if (table === 'checklists') {
      return checklistsQuery;
    }
    if (table === 'checklist_items') {
      return checklistItemsQuery;
    }
    throw new Error(`Unexpected table name: ${table}`);
  });

  const setDeadlinesResponse = (response: QueryResult) => {
    deadlinesResponse = response;
    syncOrderResponse();
  };

  const reset = () => {
    selectChain.select.mockClear().mockReturnThis();
    selectChain.eq.mockClear().mockReturnThis();
    upsertMock.mockClear().mockResolvedValue({ data: null, error: null });
    setDeadlinesResponse({ data: [], error: null });
    resetDealQuery();
    resetContactsQuery();
    resetDocumentsQuery();
    resetChecklistsQuery();
    resetChecklistItemsQuery();
    resetActivityLogQuery();
  };

  return {
    fromMock,
    upsertMock,
    insertMock,
    selectChain,
    setDeadlinesResponse,
    reset,
    dealsQuery,
    setDealsSelectResponse,
    setDealsListResponse: setDealsRangeResponse,
    contactsQuery,
    setContactsSelectResponse,
    setContactsListResponse: setContactsRangeResponse,
    documentsQuery,
    setDocumentsSelectResponse,
    setDocumentsListResponse: setDocumentsRangeResponse,
    checklistsQuery,
    setChecklistsSelectResponse,
    setChecklistsListResponse: setChecklistsRangeResponse,
    checklistItemsQuery,
    setChecklistItemsSelectResponse,
    setChecklistItemsListResponse: setChecklistItemsRangeResponse,
    activityLogQuery,
    setActivityLogSelectResponse,
    setActivityLogListResponse: setActivityLogRangeResponse,
    setActivityLogInsertResponse
  };
};
