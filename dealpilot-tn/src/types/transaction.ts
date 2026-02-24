import type { TimelineEvent } from './forms';
export type Phase = 'ExecutedContract'|'Inspection'|'Resolution'|'Appraisal'|'Financing'|'PreClose'|'Closed'|'Terminated';

export type Transaction = {
  id: string;
  phase: Phase;
  checklist_completed?: string[];
  docs_uploaded?: string[];
  metadata?: Record<string, any>;
};

export type TransactionChecklist = { id: string; name: string; completed: boolean; phase: Phase };
export type FileAudit = { name: string; verified: boolean };
export type OfferIntent = any;
export type DraftFormBundle = { forms: any[]; ready_to_submit: boolean; review_notes?: string[] };
