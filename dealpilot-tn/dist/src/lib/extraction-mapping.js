"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapExtractionToTransaction = void 0;
const mapExtractionToTransaction = (extracted) => {
    // naive mapping: map common fields
    return {
        contract_date: extracted.contract_date || extracted.contractDate || extracted.date || null,
        value: extracted.price || extracted.value || null,
        financingType: extracted.financingType || (extracted.financing && extracted.financing.type) || null,
        inspection_days: extracted.inspection_days || extracted.inspectionDays || null,
        metadata: extracted.metadata || {}
    };
};
exports.mapExtractionToTransaction = mapExtractionToTransaction;
exports.default = exports.mapExtractionToTransaction;
