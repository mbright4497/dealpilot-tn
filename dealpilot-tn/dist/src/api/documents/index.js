"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDocumentsEndpoint = exports.deleteDocumentEndpoint = exports.updateDocumentEndpoint = exports.getDocumentEndpoint = exports.createDocumentEndpoint = void 0;
const documents_1 = require("../../lib/documents");
const toNumber = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(num) ? undefined : num;
};
exports.createDocumentEndpoint = documents_1.createDocument;
const getDocumentEndpoint = async (id) => {
    const document = await (0, documents_1.getDocument)(id);
    if (!document) {
        throw new Error('Document not found.');
    }
    return document;
};
exports.getDocumentEndpoint = getDocumentEndpoint;
exports.updateDocumentEndpoint = documents_1.updateDocument;
exports.deleteDocumentEndpoint = documents_1.deleteDocument;
const listDocumentsEndpoint = async (query = {}) => {
    const options = {
        limit: toNumber(query.limit),
        page: toNumber(query.page),
        deal_id: query.deal_id,
        type: query.type
    };
    return (0, documents_1.listDocuments)(options);
};
exports.listDocumentsEndpoint = listDocumentsEndpoint;
