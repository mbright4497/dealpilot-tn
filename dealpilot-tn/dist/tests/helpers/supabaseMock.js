"use strict";
/// <reference types="jest" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseMock = void 0;
const createTableQueryContext = () => {
    let selectResponse = { data: null, error: null };
    let rangeResponse = { data: [], error: null, count: 0 };
    let insertResponse = { data: null, error: null };
    const query = {};
    query.insert = jest.fn().mockReturnThis();
    query.update = jest.fn().mockReturnThis();
    query.delete = jest.fn().mockReturnThis();
    query.select = jest.fn().mockReturnThis();
    query.eq = jest.fn().mockReturnThis();
    query.order = jest.fn().mockReturnThis();
    query.range = jest.fn().mockImplementation(() => Promise.resolve(rangeResponse));
    query.single = jest.fn().mockImplementation(() => Promise.resolve(selectResponse));
    query.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(selectResponse));
    query.then = jest.fn().mockImplementation((resolve) => Promise.resolve(insertResponse).then(resolve));
    query.catch = jest.fn().mockImplementation((reject) => Promise.resolve(insertResponse).catch(reject));
    const setSelectResponse = (response) => {
        selectResponse = response;
    };
    const setRangeResponse = (response) => {
        rangeResponse = response;
    };
    const setInsertResponse = (response) => {
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
        query.then.mockReset().mockImplementation((resolve) => Promise.resolve(insertResponse).then(resolve));
        query.catch.mockReset().mockImplementation((reject) => Promise.resolve(insertResponse).catch(reject));
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
const createDealQuery = () => createTableQueryContext();
const createSupabaseMock = () => {
    const { query: dealsQuery, setSelectResponse: setDealsSelectResponse, setRangeResponse: setDealsRangeResponse, reset: resetDealQuery } = createDealQuery();
    const { query: contactsQuery, setSelectResponse: setContactsSelectResponse, setRangeResponse: setContactsRangeResponse, reset: resetContactsQuery } = createTableQueryContext();
    const { query: documentsQuery, setSelectResponse: setDocumentsSelectResponse, setRangeResponse: setDocumentsRangeResponse, reset: resetDocumentsQuery } = createTableQueryContext();
    const { query: checklistsQuery, setSelectResponse: setChecklistsSelectResponse, setRangeResponse: setChecklistsRangeResponse, reset: resetChecklistsQuery } = createTableQueryContext();
    const { query: checklistItemsQuery, setSelectResponse: setChecklistItemsSelectResponse, setRangeResponse: setChecklistItemsRangeResponse, reset: resetChecklistItemsQuery } = createTableQueryContext();
    const { query: activityLogQuery, setSelectResponse: setActivityLogSelectResponse, setRangeResponse: setActivityLogRangeResponse, setInsertResponse: setActivityLogInsertResponse, reset: resetActivityLogQuery } = createTableQueryContext();
    const insertMock = activityLogQuery.insert;
    const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn()
    };
    let deadlinesResponse = { data: [], error: null };
    const syncOrderResponse = () => {
        selectChain.order.mockImplementation(() => Promise.resolve(deadlinesResponse));
    };
    syncOrderResponse();
    const fromMock = jest.fn((table) => {
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
    const setDeadlinesResponse = (response) => {
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
exports.createSupabaseMock = createSupabaseMock;
