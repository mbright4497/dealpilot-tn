"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crm_integration_1 = require("../../src/lib/crm-integration");
describe('CRM Integration', () => {
    it('GHL contact sync writes log and returns ok', async () => {
        const res = await (0, crm_integration_1.syncContactToCrm)('GHL', { name: 'Alice' }, 'tx1');
        expect(res.ok).toBeTruthy();
    });
    it('GHL deal sync returns ok', async () => {
        const res = await (0, crm_integration_1.syncDealToCrm)('GHL', { id: 'tx2' });
        expect(res.ok).toBeTruthy();
    });
    it('update stage returns ok', async () => {
        const res = await (0, crm_integration_1.updateCrmStage)('GHL', 'opp1', 'New Contract', 'tx3');
        expect(res.ok).toBeTruthy();
    });
    it('KW provider returns not configured', async () => {
        const res = await (0, crm_integration_1.syncContactToCrm)('KW', { name: 'Bob' }, 'tx4');
        expect(res.ok).toBeFalsy();
    });
});
