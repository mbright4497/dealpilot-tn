import {
  createContact as createContactRecord,
  deleteContact as deleteContactRecord,
  getContact as getContactRecord,
  listContacts as listContactsRecord,
  updateContact as updateContactRecord,
  type ContactRecord,
  type ListContactsOptions,
  type ListContactsResult,
  type UpdateContactInput
} from '../../lib/contacts';

export type { ContactRecord, CreateContactInput, UpdateContactInput, ListContactsResult } from '../../lib/contacts';

export type ContactsListQuery = {
  limit?: string | number;
  page?: string | number;
  name?: string;
  email?: string;
  phone?: string;
};

const toNumber = (value?: string | number): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export const createContactEndpoint = createContactRecord;

export const getContactEndpoint = async (id: string): Promise<ContactRecord> => {
  const contact = await getContactRecord(id);
  if (!contact) {
    throw new Error('Contact not found.');
  }
  return contact;
};

export const updateContactEndpoint = updateContactRecord;

export const deleteContactEndpoint = deleteContactRecord;

export const listContactsEndpoint = async (query: ContactsListQuery = {}): Promise<ListContactsResult> => {
  const options: ListContactsOptions = {
    limit: toNumber(query.limit),
    page: toNumber(query.page),
    name: query.name,
    email: query.email,
    phone: query.phone
  };
  return listContactsRecord(options);
};
