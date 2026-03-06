"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseMock_1 = require("../helpers/supabaseMock");
let supabaseMock;
jest.mock('../../src/lib/supabase', () => {
    supabaseMock = (0, supabaseMock_1.createSupabaseMock)();
    return {
        supabaseAdmin: {
            from: supabaseMock.fromMock
        }
    };
});
const { createContactEndpoint, getContactEndpoint, updateContactEndpoint, deleteContactEndpoint, listContactsEndpoint } = require('../../src/api/contacts');
const getContext = () => {
    if (!supabaseMock) {
        throw new Error('Supabase mock was not initialized');
    }
    return supabaseMock;
};
const baseContactRow = {
    id: 'contact-123',
    name: 'Alice Buyer',
    email: 'alice@example.com',
    phone: '555-0101',
    metadata: { role: 'buyer' },
    created_at: '2026-01-01T00:00:00Z'
};
const normalizedContact = {
    id: baseContactRow.id,
    name: baseContactRow.name,
    email: baseContactRow.email,
    phone: baseContactRow.phone,
    metadata: baseContactRow.metadata,
    created_at: baseContactRow.created_at
};
describe('contacts endpoints', () => {
    beforeEach(() => {
        getContext().reset();
    });
    it('creates a contact through Supabase', async () => {
        const payload = {
            name: 'Alice Buyer',
            email: 'alice@example.com'
        };
        getContext().setContactsSelectResponse({ data: baseContactRow, error: null });
        const contact = await createContactEndpoint(payload);
        expect(getContext().contactsQuery.insert).toHaveBeenCalledWith(payload);
        expect(getContext().contactsQuery.select).toHaveBeenCalledWith('*');
        expect(contact).toEqual(normalizedContact);
    });
    it('returns a contact by id', async () => {
        getContext().setContactsSelectResponse({ data: baseContactRow, error: null });
        const contact = await getContactEndpoint('contact-123');
        expect(getContext().contactsQuery.select).toHaveBeenCalledWith('*');
        expect(getContext().contactsQuery.eq).toHaveBeenCalledWith('id', 'contact-123');
        expect(contact).toEqual(normalizedContact);
    });
    it('throws when a contact is missing', async () => {
        getContext().setContactsSelectResponse({ data: null, error: null });
        await expect(getContactEndpoint('contact-unknown')).rejects.toThrow('Contact not found.');
    });
    it('updates a contact atomically', async () => {
        getContext().setContactsSelectResponse({ data: baseContactRow, error: null });
        const updates = { phone: '555-0202' };
        const contact = await updateContactEndpoint('contact-123', updates);
        expect(getContext().contactsQuery.update).toHaveBeenCalledWith(updates);
        expect(getContext().contactsQuery.eq).toHaveBeenCalledWith('id', 'contact-123');
        expect(contact).toEqual(normalizedContact);
    });
    it('deletes a contact transactionally', async () => {
        getContext().setContactsSelectResponse({ data: baseContactRow, error: null });
        const contact = await deleteContactEndpoint('contact-123');
        expect(getContext().contactsQuery.delete).toHaveBeenCalled();
        expect(getContext().contactsQuery.eq).toHaveBeenCalledWith('id', 'contact-123');
        expect(contact).toEqual(normalizedContact);
    });
    it('lists contacts with pagination and filters', async () => {
        getContext().setContactsListResponse({ data: [baseContactRow], error: null, count: 1 });
        const result = await listContactsEndpoint({ limit: '3', page: '2', name: 'Alice Buyer', email: 'alice@example.com' });
        expect(getContext().contactsQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
        expect(getContext().contactsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
        expect(getContext().contactsQuery.range).toHaveBeenCalledWith(3, 5);
        expect(getContext().contactsQuery.eq).toHaveBeenCalledWith('name', 'Alice Buyer');
        expect(getContext().contactsQuery.eq).toHaveBeenCalledWith('email', 'alice@example.com');
        expect(result.data).toEqual([normalizedContact]);
        expect(result.count).toBe(1);
        expect(result.limit).toBe(3);
        expect(result.page).toBe(2);
    });
});
