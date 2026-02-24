import { advancePhase, auditTransaction, buildDraftFormBundle } from '../../src/lib/phase-machine';
import type { Transaction, TransactionChecklist, FileAudit } from '../../src/types/transaction';

describe('Phase Machine', () => {
  it('advances through happy path', () => {
    let tx: Transaction = { id: 't1', phase: 'ExecutedContract' } as any;
    tx = advancePhase(tx, 'toInspection');
    expect(tx.phase).toEqual('Inspection');
    tx.checklist_completed = ['inspection_completed'];
    tx = advancePhase(tx, 'toResolution');
    expect(tx.phase).toEqual('Resolution');
  });

  it('prevents transition when prerequisites missing', () => {
    let tx: Transaction = { id: 't2', phase: 'Inspection' } as any;
    tx = advancePhase(tx, 'toResolution');
    // without inspection_completed shouldn't move
    expect(tx.phase).toEqual('Inspection');
  });

  it('can terminate from any phase', () => {
    let tx: Transaction = { id: 't3', phase: 'Appraisal' } as any;
    tx = advancePhase(tx, 'terminate');
    expect(tx.phase).toEqual('Terminated');
  });
});

describe('Audit', () => {
  it('detects missing files and checklist items', () => {
    const tx: Transaction = { id: 't4', phase: 'Inspection' } as any;
    const checklist: TransactionChecklist[] = [{ id: 'c1', name: 'ins', completed: false, phase: 'Inspection' }];
    const files: FileAudit[] = [{ name: 'RF401', verified: true }];
    const res = auditTransaction(tx, checklist, files);
    expect(res.compliant).toBe(false);
    expect(res.issues.length).toBeGreaterThan(0);
  });
});

describe('Draft bundle', () => {
  it('builds draft bundle from offerIntent', () => {
    const bundle = buildDraftFormBundle({ price: 300000 } as any, { deal_id:'d1'} as any, [], [] as any);
    expect(bundle.forms.length).toBeGreaterThan(0);
    expect(typeof bundle.ready_to_submit).toBe('boolean');
  });
});
