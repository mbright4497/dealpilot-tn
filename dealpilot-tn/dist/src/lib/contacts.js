"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listContacts = exports.deleteContact = exports.updateContact = exports.getContact = exports.createContact = void 0;
const supabase_1 = require("./supabase");
const pagination_1 = require("./pagination");
const TABLE_NAME = 'contacts';
const normalizeContact = (row) => {
    if (!row)
        return null;
    return {
        id: row.id,
        created_at: row.created_at,
        name: row.name,
        email: row.email,
        phone: row.phone,
        metadata: row.metadata ?? null
    };
};
const applyFilters = (query, options) => {
    if (options.name !== undefined && options.name !== null && options.name !== '') {
        query.eq('name', options.name);
    }
    if (options.email !== undefined && options.email !== null && options.email !== '') {
        query.eq('email', options.email);
    }
    if (options.phone !== undefined && options.phone !== null && options.phone !== '') {
        query.eq('phone', options.phone);
    }
};
const createContact = async (payload) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeContact(data);
    if (!record) {
        throw new Error('Failed to create contact.');
    }
    return record;
};
exports.createContact = createContact;
const getContact = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
    if (error) {
        throw error;
    }
    return normalizeContact(data);
};
exports.getContact = getContact;
const updateContact = async (id, updates) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeContact(data);
    if (!record) {
        throw new Error('Contact not found.');
    }
    return record;
};
exports.updateContact = updateContact;
const deleteContact = async (id) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
    if (error) {
        throw error;
    }
    const record = normalizeContact(data);
    if (!record) {
        throw new Error('Contact not found.');
    }
    return record;
};
exports.deleteContact = deleteContact;
const listContacts = async (options = {}) => {
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
        data: rows.map(row => normalizeContact(row)).filter((row) => row !== null),
        count: typeof count === 'number' ? count : null,
        limit,
        page
    };
};
exports.listContacts = listContacts;
