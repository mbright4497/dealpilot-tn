"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChecklistItems = exports.deleteChecklistItem = exports.updateChecklistItem = exports.getChecklistItem = exports.createChecklistItem = void 0;
const supabase_1 = require("./supabase");
const pagination_1 = require("./pagination");
const TABLE_NAME = 'checklist_items';
const normalizeChecklistItem = (row) => {
    if (!row)
        return null;
    return {
        id: row.id,
        created_at: row.created_at,
        checklist_id: row.checklist_id,
        title: row.title,
        description: row.description,
        owner: row.owner,
        due_date: row.due_date,
        completed: Boolean(row.completed),
        metadata: row.metadata ?? null
    };
};
const applyFilters = (query, options) => {
    if (options.checklist_id !== undefined && options.checklist_id !== null && options.checklist_id !== '') {
        query.eq('checklist_id', options.checklist_id);
    }
    if (options.owner !== undefined && options.owner !== null && options.owner !== '') {
        query.eq('owner', options.owner);
    }
    if (options.completed !== undefined && options.completed !== null) {
        query.eq('completed', options.completed);
    }
};
const createChecklistItem = async (payload) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeChecklistItem(data);
    if (!record) {
        throw new Error('Failed to create checklist item.');
    }
    return record;
};
exports.createChecklistItem = createChecklistItem;
const getChecklistItem = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
    if (error) {
        throw error;
    }
    return normalizeChecklistItem(data);
};
exports.getChecklistItem = getChecklistItem;
const updateChecklistItem = async (id, updates) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeChecklistItem(data);
    if (!record) {
        throw new Error('Checklist item not found.');
    }
    return record;
};
exports.updateChecklistItem = updateChecklistItem;
const deleteChecklistItem = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeChecklistItem(data);
    if (!record) {
        throw new Error('Checklist item not found.');
    }
    return record;
};
exports.deleteChecklistItem = deleteChecklistItem;
const listChecklistItems = async (options = {}) => {
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
        data: rows.map(row => normalizeChecklistItem(row)).filter((row) => row !== null),
        count: typeof count === 'number' ? count : null,
        limit,
        page
    };
};
exports.listChecklistItems = listChecklistItems;
