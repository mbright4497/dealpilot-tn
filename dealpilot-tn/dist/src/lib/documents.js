"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDocuments = exports.deleteDocument = exports.updateDocument = exports.getDocument = exports.createDocument = void 0;
const supabase_1 = require("./supabase");
const pagination_1 = require("./pagination");
const TABLE_NAME = 'documents';
const normalizeDocument = (row) => {
    if (!row)
        return null;
    return {
        id: row.id,
        created_at: row.created_at,
        deal_id: row.deal_id,
        name: row.name,
        type: row.type,
        url: row.url,
        metadata: row.metadata ?? null
    };
};
const applyFilters = (query, options) => {
    if (options.deal_id !== undefined && options.deal_id !== null && options.deal_id !== '') {
        query.eq('deal_id', options.deal_id);
    }
    if (options.type !== undefined && options.type !== null && options.type !== '') {
        query.eq('type', options.type);
    }
};
const createDocument = async (payload) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeDocument(data);
    if (!record) {
        throw new Error('Failed to create document.');
    }
    return record;
};
exports.createDocument = createDocument;
const getDocument = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
    if (error) {
        throw error;
    }
    return normalizeDocument(data);
};
exports.getDocument = getDocument;
const updateDocument = async (id, updates) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeDocument(data);
    if (!record) {
        throw new Error('Document not found.');
    }
    return record;
};
exports.updateDocument = updateDocument;
const deleteDocument = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeDocument(data);
    if (!record) {
        throw new Error('Document not found.');
    }
    return record;
};
exports.deleteDocument = deleteDocument;
const listDocuments = async (options = {}) => {
    const limit = (0, pagination_1.clampLimit)(options.limit);
    const page = (0, pagination_1.clampPage)(options.page);
    const { start, end } = (0, pagination_1.getRangeBounds)(limit, page);
    const query = supabase_1.supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
    applyFilters(query, options);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
    if (error) {
        throw error;
    }
    const rows = (Array.isArray(data) ? data : []);
    return {
        data: rows.map(row => normalizeDocument(row)).filter((row) => row !== null),
        count: typeof count === 'number' ? count : null,
        limit,
        page
    };
};
exports.listDocuments = listDocuments;
