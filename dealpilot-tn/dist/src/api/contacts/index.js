"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listContactsEndpoint = exports.deleteContactEndpoint = exports.updateContactEndpoint = exports.getContactEndpoint = exports.createContactEndpoint = void 0;
const contacts_1 = require("../../lib/contacts");
const toNumber = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(num) ? undefined : num;
};
exports.createContactEndpoint = contacts_1.createContact;
const getContactEndpoint = async (id) => {
    const contact = await (0, contacts_1.getContact)(id);
    if (!contact) {
        throw new Error('Contact not found.');
    }
    return contact;
};
exports.getContactEndpoint = getContactEndpoint;
exports.updateContactEndpoint = contacts_1.updateContact;
exports.deleteContactEndpoint = contacts_1.deleteContact;
const listContactsEndpoint = async (query = {}) => {
    const options = {
        limit: toNumber(query.limit),
        page: toNumber(query.page),
        name: query.name,
        email: query.email,
        phone: query.phone
    };
    return (0, contacts_1.listContacts)(options);
};
exports.listContactsEndpoint = listContactsEndpoint;
