import {
  createDocument as createDocumentRecord,
  deleteDocument as deleteDocumentRecord,
  getDocument as getDocumentRecord,
  listDocuments as listDocumentsRecord,
  updateDocument as updateDocumentRecord,
  type DocumentRecord,
  type ListDocumentsOptions,
  type ListDocumentsResult,
  type UpdateDocumentInput
} from '../../lib/documents';

export type { DocumentRecord, CreateDocumentInput, UpdateDocumentInput, ListDocumentsResult } from '../../lib/documents';

export type DocumentsListQuery = {
  limit?: string | number;
  page?: string | number;
  deal_id?: string;
  type?: string;
};

const toNumber = (value?: string | number): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export const createDocumentEndpoint = createDocumentRecord;

export const getDocumentEndpoint = async (id: string): Promise<DocumentRecord> => {
  const document = await getDocumentRecord(id);
  if (!document) {
    throw new Error('Document not found.');
  }
  return document;
};

export const updateDocumentEndpoint = updateDocumentRecord;

export const deleteDocumentEndpoint = deleteDocumentRecord;

export const listDocumentsEndpoint = async (query: DocumentsListQuery = {}): Promise<ListDocumentsResult> => {
  const options: ListDocumentsOptions = {
    limit: toNumber(query.limit),
    page: toNumber(query.page),
    deal_id: query.deal_id,
    type: query.type
  };
  return listDocumentsRecord(options);
};
