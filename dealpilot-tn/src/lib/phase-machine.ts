import type { Transaction, TransactionChecklist, FileAudit, DraftFormBundle, OfferIntent } from '../types/transaction';
import { evaluateFormsForDeal } from './form-engine';
import { FORM_DEFINITIONS, FORM_RULES } from '../data/form-seeds';
import { generateDeadlinesForDeal } from './timeline-engine';
import type { DealContext, FormDefinition, FormRule } from '../types/forms';

export const advancePhase = (tx: Transaction, event: string): Transaction => {
  const prev = tx.phase;
  let next = prev;
  const meta = tx.metadata || {};
  const has = (k:string)=> (tx.checklist_completed||[]).includes(k);

  const canTo = (p: string) => {
    if (p==='Resolution' && !has('inspection_completed')) return false;
    if (p==='PreClose' && !(has('title_clear') && has('financing_confirmed'))) return false;
    return true;
  };

  if (event==='toInspection' && prev==='ExecutedContract' && canTo('Inspection')) next='Inspection';
  if (event==='toResolution' && prev==='Inspection' && canTo('Resolution')) next='Resolution';
  if (event==='toAppraisal' && prev==='Resolution') next='Appraisal';
  if (event==='toFinancing' && prev==='Appraisal') next='Financing';
  if (event==='toPreClose' && prev==='Financing' && canTo('PreClose')) next='PreClose';
  if (event==='toClosed' && prev==='PreClose') next='Closed';
  if (event==='terminate') next='Terminated';

  // on change, trigger checklists, forms, deadlines
  if (next !== prev) {
    // add checklist item (simple)
    tx.checklist_completed = tx.checklist_completed || [];
    tx.checklist_completed.push(`phase:${next}`);
    const forms = evaluateFormsForDeal({deal_id: tx.id} as DealContext, [], FORM_RULES as any);
    const deadlines = generateDeadlinesForDeal(tx.id, new Date().toISOString().slice(0,10));
    tx.metadata = {...meta, generated_forms: forms.length, generated_deadlines: deadlines.length};
  }
  tx.phase = next as Transaction['phase'];
  return tx;
};

export const auditTransaction = (tx: Transaction, checklist: TransactionChecklist[], files: FileAudit[]) => {
  const issues: string[] = [];
  const missing_files: string[] = [];
  const overdue_items: any[] = [];
  const required_docs = ['RF401','ProofOfFunds'];
  for (const d of required_docs) if (!(files.find(f=>f.name===d && f.verified))) missing_files.push(d);
  for (const chk of checklist) if (chk.phase===tx.phase && !chk.completed) issues.push(`Checklist item incomplete: ${chk.name}`);
  const compliant = issues.length===0 && missing_files.length===0;
  return { compliant, issues, missing_files, overdue_items };
};

export const buildDraftFormBundle = (offerIntent: OfferIntent, context: DealContext, forms: FormDefinition[], rules: FormRule[]): DraftFormBundle => {
  // naive mapping: if offerIntent.price present map to RF209
  const bundle: any[] = [];
  if (offerIntent.price) bundle.push({ formId: 'RF209', fields: { offer_price: offerIntent.price } });
  // check required fields
  const missing: string[] = [];
  for (const f of bundle) {
    if (!f.fields) missing.push(f.formId);
  }
  return { forms: bundle, ready_to_submit: missing.length===0, review_notes: missing.length?['missing fields']:[] };
};

export default { advancePhase, auditTransaction, buildDraftFormBundle };
