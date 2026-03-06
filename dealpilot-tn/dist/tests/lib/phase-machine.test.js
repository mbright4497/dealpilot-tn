"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const phase_machine_1 = require("../../src/lib/phase-machine");
describe('Phase Machine', () => {
    it('advances through happy path', () => {
        let tx = { id: 't1', phase: 'ExecutedContract' };
        tx = (0, phase_machine_1.advancePhase)(tx, 'toInspection');
        expect(tx.phase).toEqual('Inspection');
        tx.checklist_completed = ['inspection_completed'];
        tx = (0, phase_machine_1.advancePhase)(tx, 'toResolution');
        expect(tx.phase).toEqual('Resolution');
    });
    it('prevents transition when prerequisites missing', () => {
        let tx = { id: 't2', phase: 'Inspection' };
        tx = (0, phase_machine_1.advancePhase)(tx, 'toResolution');
        // without inspection_completed shouldn't move
        expect(tx.phase).toEqual('Inspection');
    });
    it('can terminate from any phase', () => {
        let tx = { id: 't3', phase: 'Appraisal' };
        tx = (0, phase_machine_1.advancePhase)(tx, 'terminate');
        expect(tx.phase).toEqual('Terminated');
    });
});
describe('Audit', () => {
    it('detects missing files and checklist items', () => {
        const tx = { id: 't4', phase: 'Inspection' };
        const checklist = [{ id: 'c1', name: 'ins', completed: false, phase: 'Inspection' }];
        const files = [{ name: 'RF401', verified: true }];
        const res = (0, phase_machine_1.auditTransaction)(tx, checklist, files);
        expect(res.compliant).toBe(false);
        expect(res.issues.length).toBeGreaterThan(0);
    });
});
describe('Draft bundle', () => {
    it('builds draft bundle from offerIntent', () => {
        const bundle = (0, phase_machine_1.buildDraftFormBundle)({ price: 300000 }, { deal_id: 'd1' }, [], []);
        expect(bundle.forms.length).toBeGreaterThan(0);
        expect(typeof bundle.ready_to_submit).toBe('boolean');
    });
});
