"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDraftFormBundle = exports.auditTransaction = exports.advancePhase = void 0;
const form_engine_1 = require("./form-engine");
const form_seeds_1 = require("../data/form-seeds");
const timeline_engine_1 = require("./timeline-engine");
const advancePhase = (tx, event) => {
    const prev = tx.phase;
    let next = prev;
    const meta = tx.metadata || {};
    const has = (k) => (tx.checklist_completed || []).includes(k);
    const canTo = (p) => {
        if (p === 'Resolution' && !has('inspection_completed'))
            return false;
        if (p === 'PreClose' && !(has('title_clear') && has('financing_confirmed')))
            return false;
        return true;
    };
    if (event === 'toInspection' && prev === 'ExecutedContract' && canTo('Inspection'))
        next = 'Inspection';
    if (event === 'toResolution' && prev === 'Inspection' && canTo('Resolution'))
        next = 'Resolution';
    if (event === 'toAppraisal' && prev === 'Resolution')
        next = 'Appraisal';
    if (event === 'toFinancing' && prev === 'Appraisal')
        next = 'Financing';
    if (event === 'toPreClose' && prev === 'Financing' && canTo('PreClose'))
        next = 'PreClose';
    if (event === 'toClosed' && prev === 'PreClose')
        next = 'Closed';
    if (event === 'terminate')
        next = 'Terminated';
    // on change, trigger checklists, forms, deadlines
    if (next !== prev) {
        // add checklist item (simple)
        tx.checklist_completed = tx.checklist_completed || [];
        tx.checklist_completed.push(`phase:${next}`);
        const forms = (0, form_engine_1.evaluateFormsForDeal)({ deal_id: tx.id }, [], form_seeds_1.FORM_RULES);
        const deadlines = (0, timeline_engine_1.generateDeadlinesForDeal)(tx.id, new Date().toISOString().slice(0, 10));
        tx.metadata = { ...meta, generated_forms: forms.length, generated_deadlines: deadlines.length };
    }
    tx.phase = next;
    return tx;
};
exports.advancePhase = advancePhase;
const auditTransaction = (tx, checklist, files) => {
    const issues = [];
    const missing_files = [];
    const overdue_items = [];
    const required_docs = ['RF401', 'ProofOfFunds'];
    for (const d of required_docs)
        if (!(files.find(f => f.name === d && f.verified)))
            missing_files.push(d);
    for (const chk of checklist)
        if (chk.phase === tx.phase && !chk.completed)
            issues.push(`Checklist item incomplete: ${chk.name}`);
    const compliant = issues.length === 0 && missing_files.length === 0;
    return { compliant, issues, missing_files, overdue_items };
};
exports.auditTransaction = auditTransaction;
const buildDraftFormBundle = (offerIntent, context, forms, rules) => {
    // naive mapping: if offerIntent.price present map to RF209
    const bundle = [];
    if (offerIntent.price)
        bundle.push({ formId: 'RF209', fields: { offer_price: offerIntent.price } });
    // check required fields
    const missing = [];
    for (const f of bundle) {
        if (!f.fields)
            missing.push(f.formId);
    }
    return { forms: bundle, ready_to_submit: missing.length === 0, review_notes: missing.length ? ['missing fields'] : [] };
};
exports.buildDraftFormBundle = buildDraftFormBundle;
exports.default = { advancePhase: exports.advancePhase, auditTransaction: exports.auditTransaction, buildDraftFormBundle: exports.buildDraftFormBundle };
