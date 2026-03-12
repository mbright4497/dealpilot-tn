"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sectionProgress = exports.sectionPaths = exports.sectionOrder = exports.UNKNOWN_MARKER = void 0;
exports.buildDefaultWizardData = buildDefaultWizardData;
exports.mergeWizardRow = mergeWizardRow;
exports.missingFields = missingFields;
exports.sanitizeSectionPayload = sanitizeSectionPayload;
exports.markSectionUnknown = markSectionUnknown;
exports.intakeApplyFields = intakeApplyFields;
exports.summaryText = summaryText;
exports.getSectionDefinitions = getSectionDefinitions;
exports.UNKNOWN_MARKER = 'unknown in current RF401 reference';
const sectionFields = {
    section_1: [
        { key: 'buyer_name', label: 'Buyer legal name', type: 'text' },
        { key: 'seller_name', label: 'Seller legal name', type: 'text' },
        { key: 'property_address', label: 'Property address', type: 'text' },
        { key: 'county', label: 'County', type: 'text' },
        { key: 'deed_instrument_reference', label: 'Deed/instrument reference', type: 'text' },
        { key: 'included_items', label: 'Included items', type: 'array' },
        { key: 'remaining_items', label: 'Remaining items', type: 'array' },
        { key: 'excluded_items', label: 'Excluded items', type: 'array' },
        { key: 'leased_items', label: 'Leased items', type: 'array' },
        { key: 'fuel_adjustment', label: 'Fuel adjustment reference', type: 'text' },
    ],
    section_2: [
        { key: 'purchase_price_numeric', label: 'Purchase price (numeric)', type: 'number' },
        { key: 'purchase_price_written', label: 'Purchase price (written)', type: 'text' },
        { key: 'loan_to_value_percent', label: 'Loan-to-value (%)', type: 'number' },
        { key: 'financing_type', label: 'Financing type', type: 'enum', enumOptions: ['Conventional', 'FHA', 'VA', 'USDA', 'Other'] },
        { key: 'financial_contingency', label: 'Financial contingency', type: 'text' },
        { key: 'appraisal_contingency', label: 'Appraisal contingency', type: 'text' },
    ],
    section_2d: [
        { key: 'seller_expenses', label: 'Seller expenses', type: 'text' },
        { key: 'buyer_expenses', label: 'Buyer expenses', type: 'text' },
        { key: 'title_expense_allocation', label: 'Title expense allocation', type: 'text' },
        { key: 'buyer_closing_agency_name', label: 'Buyer closing agency name', type: 'text' },
        { key: 'buyer_closing_agency_contact', label: 'Buyer closing agency contact', type: 'text' },
        { key: 'buyer_closing_agency_email', label: 'Buyer closing agency email', type: 'text' },
        { key: 'buyer_closing_agency_phone', label: 'Buyer closing agency phone', type: 'text' },
        { key: 'buyer_deed_names', label: 'Buyer deed names', type: 'array' },
    ],
    section_3_6: [
        { key: 'earnest_money_holder', label: 'Earnest money holder', type: 'text' },
        { key: 'earnest_money_amount', label: 'Earnest money amount', type: 'number' },
        { key: 'earnest_money_due_date', label: 'Earnest money due date', type: 'date' },
        { key: 'closing_date', label: 'Closing date', type: 'date' },
        { key: 'possession_terms', label: 'Possession terms', type: 'text' },
        { key: 'inspection_period_end', label: 'Inspection period end', type: 'date' },
        { key: 'repair_period_end', label: 'Repair period end', type: 'date' },
        { key: 'financing_deadline', label: 'Financing deadline', type: 'date' },
        { key: 'appraisal_deadline', label: 'Appraisal deadline', type: 'date' },
        { key: 'greenbelt_intent', label: 'Greenbelt intent', type: 'text' },
        { key: 'special_assessments', label: 'Special assessments', type: 'text' },
        { key: 'warranties_transfer', label: 'Warranty transfers', type: 'text' },
        { key: 'hoa_fees', label: 'HOA fees', type: 'text' },
        { key: 'public_water_notes', label: 'Public water notes', type: 'text' },
        { key: 'public_sewer_notes', label: 'Public sewer notes', type: 'text' },
    ],
};
exports.sectionOrder = ['section_1', 'section_2', 'section_2d', 'section_3_6'];
function defaultString() {
    return exports.UNKNOWN_MARKER;
}
function defaultArray() {
    return [exports.UNKNOWN_MARKER];
}
function defaultSection1() {
    return {
        buyer_name: defaultString(),
        seller_name: defaultString(),
        property_address: defaultString(),
        county: defaultString(),
        deed_instrument_reference: defaultString(),
        included_items: defaultArray(),
        remaining_items: defaultArray(),
        excluded_items: defaultArray(),
        leased_items: defaultArray(),
        fuel_adjustment: defaultString(),
    };
}
function defaultSection2() {
    return {
        purchase_price_numeric: null,
        purchase_price_written: defaultString(),
        loan_to_value_percent: null,
        financing_type: defaultString(),
        financial_contingency: defaultString(),
        appraisal_contingency: defaultString(),
    };
}
function defaultSection2d() {
    return {
        seller_expenses: defaultString(),
        buyer_expenses: defaultString(),
        title_expense_allocation: defaultString(),
        buyer_closing_agency_name: defaultString(),
        buyer_closing_agency_contact: defaultString(),
        buyer_closing_agency_email: defaultString(),
        buyer_closing_agency_phone: defaultString(),
        buyer_deed_names: defaultArray(),
    };
}
function defaultSection3() {
    return {
        earnest_money_holder: defaultString(),
        earnest_money_amount: null,
        earnest_money_due_date: null,
        closing_date: null,
        possession_terms: defaultString(),
        inspection_period_end: null,
        repair_period_end: null,
        financing_deadline: null,
        appraisal_deadline: null,
        greenbelt_intent: defaultString(),
        special_assessments: defaultString(),
        warranties_transfer: defaultString(),
        hoa_fees: defaultString(),
        public_water_notes: defaultString(),
        public_sewer_notes: defaultString(),
    };
}
function buildDefaultWizardData() {
    return {
        section_1: defaultSection1(),
        section_2: defaultSection2(),
        section_2d: defaultSection2d(),
        section_3_6: defaultSection3(),
        wizard_status: 'initialized',
        wizard_step: 1,
    };
}
function mergeWizardRow(row) {
    const defaults = buildDefaultWizardData();
    const result = {
        section_1: { ...defaults.section_1 },
        section_2: { ...defaults.section_2 },
        section_2d: { ...defaults.section_2d },
        section_3_6: { ...defaults.section_3_6 },
        wizard_status: row.wizard_status || defaults.wizard_status,
        wizard_step: row.wizard_step ?? defaults.wizard_step,
    };
    Object.values(sectionFields).flat().forEach((field) => {
        const sectionKey = Object.keys(sectionFields).find((sectionKey) => sectionFields[sectionKey].some((f) => f.key === field.key));
        if (!sectionKey)
            return;
        const section = result[sectionKey];
        const rawValue = row[field.key];
        if (rawValue === undefined || rawValue === null)
            return;
        if (field.type === 'array') {
            section[field.key] = Array.isArray(rawValue) ? rawValue : [String(rawValue)];
        }
        else {
            section[field.key] = rawValue;
        }
    });
    return result;
}
function isUnknownString(value) {
    return typeof value === 'string' && value.trim() === exports.UNKNOWN_MARKER;
}
function isArrayUnknown(value) {
    if (!Array.isArray(value))
        return true;
    if (value.length === 0)
        return true;
    return value.every((item) => isUnknownString(item));
}
function isValueMissing(value, definition) {
    if (definition.type === 'array') {
        return isArrayUnknown(value);
    }
    if (value === null || value === undefined)
        return true;
    if (definition.type === 'number') {
        return Number.isNaN(Number(value));
    }
    if (typeof value === 'string' && value.trim().length === 0)
        return true;
    return isUnknownString(value);
}
function missingFields(data) {
    const out = [];
    exports.sectionOrder.forEach((section) => {
        sectionFields[section].forEach((field) => {
            const value = data[section][field.key];
            if (isValueMissing(value, field)) {
                out.push(`${section}.${field.key}`);
            }
        });
    });
    return out;
}
function sanitizeSectionPayload(sectionKey, payload) {
    const definitions = sectionFields[sectionKey];
    const errors = [];
    const sanitized = {};
    for (const definition of definitions) {
        const raw = payload[definition.key];
        if (definition.type === 'number') {
            if (raw === null || raw === undefined || raw === '') {
                sanitized[definition.key] = null;
                continue;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) {
                errors.push(`${definition.label} must be a valid number`);
                continue;
            }
            sanitized[definition.key] = parsed;
            continue;
        }
        if (definition.type === 'array') {
            if (typeof raw === 'string') {
                const pieces = raw
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);
                sanitized[definition.key] = pieces.length ? pieces : defaultArray();
            }
            else if (Array.isArray(raw)) {
                sanitized[definition.key] = raw.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean);
                if (sanitized[definition.key].length === 0)
                    sanitized[definition.key] = defaultArray();
            }
            else {
                sanitized[definition.key] = defaultArray();
            }
            continue;
        }
        const textValue = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw);
        if (textValue.length === 0) {
            sanitized[definition.key] = exports.UNKNOWN_MARKER;
        }
        else {
            sanitized[definition.key] = textValue;
        }
        if (definition.enumOptions && sanitized[definition.key] !== exports.UNKNOWN_MARKER) {
            if (!definition.enumOptions.includes(sanitized[definition.key])) {
                errors.push(`${definition.label} must be one of: ${definition.enumOptions.join(', ')}`);
            }
        }
    }
    return { errors, sanitized };
}
exports.sectionPaths = {
    section_1: 'section-1',
    section_2: 'section-2',
    section_2d: 'section-2d',
    section_3_6: 'sections-3-6',
};
exports.sectionProgress = {
    section_1: { step: 2, status: 'section-1-saved' },
    section_2: { step: 3, status: 'section-2-saved' },
    section_2d: { step: 4, status: 'section-2d-saved' },
    section_3_6: { step: 5, status: 'section-3-6-saved' },
};
function markSectionUnknown(sectionKey) {
    const def = sectionFields[sectionKey];
    const result = {};
    def.forEach((field) => {
        if (field.type === 'number' || field.type === 'date') {
            result[field.key] = null;
        }
        else if (field.type === 'array') {
            result[field.key] = defaultArray();
        }
        else {
            result[field.key] = exports.UNKNOWN_MARKER;
        }
    });
    return result;
}
function intakeApplyFields(data) {
    const section1 = data.section_1;
    const section2 = data.section_2;
    const section3 = data.section_3_6;
    const clean = (value) => (value && value !== exports.UNKNOWN_MARKER ? value : null);
    return {
        propertyAddress: clean(section1.property_address),
        buyerNames: clean(section1.buyer_name),
        sellerNames: clean(section1.seller_name),
        purchasePrice: section2.purchase_price_numeric ?? null,
        bindingDate: clean(section3.earnest_money_due_date),
        inspectionEndDate: clean(section3.inspection_period_end),
        closingDate: clean(section3.closing_date),
    };
}
function summaryText(missing) {
    if (missing.length === 0)
        return 'All RF401 sections completed. Ready for export.';
    return `Follow up on ${missing.length} incomplete fields before exporting.`;
}
function getSectionDefinitions(section) {
    return sectionFields[section];
}
