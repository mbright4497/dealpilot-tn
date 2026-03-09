export const mapExtractionToTransaction = (extracted: any) => {
  // naive mapping: map common fields to transaction columns
  const contacts: any[] = []
  if (extracted.buyer_names && Array.isArray(extracted.buyer_names)) {
    for (const n of extracted.buyer_names) contacts.push({ role: 'buyer', name: n })
  }
  if (extracted.seller_names && Array.isArray(extracted.seller_names)) {
    for (const n of extracted.seller_names) contacts.push({ role: 'seller', name: n })
  }

  return {
    // canonical fields used across the app
    binding: extracted.binding_agreement_date || extracted.binding_agreement || extracted.binding || extracted.contract_date || extracted.contractDate || null,
    closing_date: extracted.closing_date || extracted.closingDate || extracted.closing || null,
    value: extracted.sale_price || extracted.purchase_price || extracted.price || extracted.value || null,
    contract_date: extracted.contract_date || extracted.contractDate || extracted.date || null,
    financingType: extracted.financingType || (extracted.financing && extracted.financing.type) || null,
    inspection_days: extracted.inspection_period_days || extracted.inspectionDays || extracted.inspection_days || null,
    contacts: contacts,
    metadata: extracted.metadata || {}
  };
};

export default mapExtractionToTransaction;
