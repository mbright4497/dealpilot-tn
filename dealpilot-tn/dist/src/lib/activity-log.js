"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActivityLog = exports.deleteActivityLog = exports.updateActivityLog = exports.getActivityLog = exports.createActivityLog = void 0;
const supabase_1 = require("./supabase");
const pagination_1 = require("./pagination");
const TABLE_NAME = 'activity_log';
const normalizeActivityLog = (row) => {
    if (!row)
        return null;
    return {
        id: row.id,
        created_at: row.created_at,
        deal_id: row.deal_id,
        actor: row.actor,
        action: row.action,
        detail: row.detail ?? null
    };
};
const applyFilters = (query, options) => {
    if (options.deal_id !== undefined && options.deal_id !== null && options.deal_id !== '') {
        query.eq('deal_id', options.deal_id);
    }
    if (options.actor !== undefined && options.actor !== null && options.actor !== '') {
        query.eq('actor', options.actor);
    }
    if (options.action !== undefined && options.action !== null && options.action !== '') {
        query.eq('action', options.action);
    }
};
const createActivityLog = async (payload) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeActivityLog(data);
    if (!record) {
        throw new Error('Failed to create activity log entry.');
    }
    return record;
};
exports.createActivityLog = createActivityLog;
const getActivityLog = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
    if (error) {
        throw error;
    }
    return normalizeActivityLog(data);
};
exports.getActivityLog = getActivityLog;
const updateActivityLog = async (id, updates) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeActivityLog(data);
    if (!record) {
        throw new Error('Activity log entry not found.');
    }
    return record;
};
exports.updateActivityLog = updateActivityLog;
const deleteActivityLog = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeActivityLog(data);
    if (!record) {
        throw new Error('Activity log entry not found.');
    }
    return record;
};
exports.deleteActivityLog = deleteActivityLog;
const listActivityLog = async (options = {}) => {
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
        data: rows.map(row => normalizeActivityLog(row)).filter((row) => row !== null),
        count: typeof count === 'number' ? count : null,
        limit,
        page
    };
};
exports.listActivityLog = listActivityLog;
