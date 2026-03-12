"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapExtractionToTransaction = void 0;
const mapExtractionToTransaction = (extracted) => {
    // naive mapping: map common fields to transaction columns
    const contacts = [];
    if (extracted.buyer_names && Array.isArray(extracted.buyer_names)) {
        for (const n of extracted.buyer_names)
            contacts.push({ role: 'buyer', name: n });
    }
    if (extracted.seller_names && Array.isArray(extracted.seller_names)) {
        for (const n of extracted.seller_names)
            contacts.push({ role: 'seller', name: n });
    }
    const buyerNamesText = extracted.buyer_names && Array.isArray(extracted.buyer_names) ? extracted.buyer_names.join(', ') : (extracted.buyer_name || null);
    const sellerNamesText = extracted.seller_names && Array.isArray(extracted.seller_names) ? extracted.seller_names.join(', ') : (extracted.seller_name || null);
    return {
        // canonical fields used across the app (transactions table expects these names)
        binding: extracted.binding_agreement_date || extracted.binding_agreement || extracted.binding || extracted.contract_date || extracted.contractDate || null,
        closing: extracted.closing_date || extracted.closingDate || extracted.closing || null,
        purchase_price: extracted.purchase_price || extracted.sale_price || extracted.price || null,
        earnest_money: extracted.earnest_money || null,
        seller_names: sellerNamesText,
        buyer_names: buyerNamesText,
        value: extracted.purchase_price != null ? String(extracted.purchase_price) : (extracted.sale_price != null ? String(extracted.sale_price) : (extracted.price != null ? String(extracted.price) : null)),
        contract_date: extracted.contract_date || extracted.contractDate || extracted.date || null,
        financingType: extracted.financingType || (extracted.financing && extracted.financing.type) || null,
        inspection_days: extracted.inspection_period_days || extracted.inspectionDays || extracted.inspection_days || null,
        contacts: contacts,
        metadata: extracted.metadata || {}
    };
};
exports.mapExtractionToTransaction = mapExtractionToTransaction;
exports.default = exports.mapExtractionToTransaction;
