"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChecklists = exports.deleteChecklist = exports.updateChecklist = exports.getChecklist = exports.createChecklist = void 0;
const supabase_1 = require("./supabase");
const pagination_1 = require("./pagination");
const TABLE_NAME = 'checklists';
const normalizeChecklist = (row) => {
    if (!row)
        return null;
    return {
        id: row.id,
        created_at: row.created_at,
        deal_id: row.deal_id,
        title: row.title,
        status: row.status,
        metadata: row.metadata ?? null
    };
};
const applyFilters = (query, options) => {
    if (options.deal_id !== undefined && options.deal_id !== null && options.deal_id !== '') {
        query.eq('deal_id', options.deal_id);
    }
    if (options.status !== undefined && options.status !== null && options.status !== '') {
        query.eq('status', options.status);
    }
};
const createChecklist = async (payload) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeChecklist(data);
    if (!record) {
        throw new Error('Failed to create checklist.');
    }
    return record;
};
exports.createChecklist = createChecklist;
const getChecklist = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
    if (error) {
        throw error;
    }
    return normalizeChecklist(data);
};
exports.getChecklist = getChecklist;
const updateChecklist = async (id, updates) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeChecklist(data);
    if (!record) {
        throw new Error('Checklist not found.');
    }
    return record;
};
exports.updateChecklist = updateChecklist;
const deleteChecklist = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeChecklist(data);
    if (!record) {
        throw new Error('Checklist not found.');
    }
    return record;
};
exports.deleteChecklist = deleteChecklist;
const listChecklists = async (options = {}) => {
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
        data: rows.map(row => normalizeChecklist(row)).filter((row) => row !== null),
        count: typeof count === 'number' ? count : null,
        limit,
        page
    };
};
exports.listChecklists = listChecklists;
