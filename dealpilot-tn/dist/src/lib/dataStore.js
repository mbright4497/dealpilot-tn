"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDeals = exports.deleteDeal = exports.updateDeal = exports.getDeal = exports.createDeal = void 0;
const supabase_1 = require("./supabase");
const TABLE_NAME = 'deals';
const normalizeDeal = (row) => {
    if (!row)
        return null;
    const parsedValue = typeof row.value === 'string'
        ? Number(row.value)
        : typeof row.value === 'number'
            ? row.value
            : null;
    return {
        id: row.id,
        title: row.title,
        buyer_contact: row.buyer_contact,
        seller_contact: row.seller_contact,
        status: row.status,
        value: Number.isNaN(parsedValue) ? null : parsedValue,
        metadata: row.metadata ?? null,
        created_at: row.created_at
    };
};
const createDeal = async (payload) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
    if (error) {
        throw error;
    }
    const deal = normalizeDeal(data);
    if (!deal) {
        throw new Error('Failed to create deal.');
    }
    return deal;
};
exports.createDeal = createDeal;
const getDeal = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) {
        throw error;
    }
    return normalizeDeal(data);
};
exports.getDeal = getDeal;
const updateDeal = async (id, updates) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
    if (error) {
        throw error;
    }
    const updated = normalizeDeal(data);
    if (!updated) {
        throw new Error('Deal not found.');
    }
    return updated;
};
exports.updateDeal = updateDeal;
const deleteDeal = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from(TABLE_NAME)
        .delete()
        .eq('id', id)
        .select('*')
        .single();
    if (error) {
        throw error;
    }
    const deleted = normalizeDeal(data);
    if (!deleted) {
        throw new Error('Deal not found.');
    }
    return deleted;
};
exports.deleteDeal = deleteDeal;
const clampLimit = (value) => {
    if (!value || Number.isNaN(value))
        return 20;
    return Math.min(Math.max(value, 1), 100);
};
const clampPage = (value) => {
    if (!value || Number.isNaN(value))
        return 1;
    return Math.max(Math.floor(value), 1);
};
const applyFilters = (query, options) => {
    if (options.status !== undefined && options.status !== null && options.status !== '') {
        query.eq('status', options.status);
    }
    if (options.buyer_contact !== undefined && options.buyer_contact !== null && options.buyer_contact !== '') {
        query.eq('buyer_contact', options.buyer_contact);
    }
    if (options.seller_contact !== undefined && options.seller_contact !== null && options.seller_contact !== '') {
        query.eq('seller_contact', options.seller_contact);
    }
};
const listDeals = async (options = {}) => {
    const limit = clampLimit(options.limit);
    const page = clampPage(options.page);
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const query = supabase_1.supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
    applyFilters(query, options);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
    if (error) {
        throw error;
    }
    const rows = (Array.isArray(data) ? data : []);
    return {
        data: rows.map(row => normalizeDeal(row)).filter((row) => row !== null),
        count: typeof count === 'number' ? count : null,
        limit,
        page
    };
};
exports.listDeals = listDeals;
