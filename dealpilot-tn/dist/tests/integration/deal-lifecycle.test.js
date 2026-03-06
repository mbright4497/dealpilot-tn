"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../src/server"));
describe('Integration: deal lifecycle', () => {
    let dealId = `deal-${Date.now()}`;
    it('creates a deal and returns transaction', async () => {
        const res = await (0, supertest_1.default)(server_1.default).post('/api/deals').send({ deal_id: dealId, binding_agreement_date: '2026-03-01', context: {} });
        expect(res.status).toBe(200);
        expect(res.body.id).toBeDefined();
    });
    it('advances through phases and triggers CRM sync (non-blocking)', async () => {
        const advance = await (0, supertest_1.default)(server_1.default).put(`/api/deals/${dealId}/advance`).send({ event: 'toInspection', checklist_completed: ['inspection_completed'] });
        expect(advance.status).toBe(200);
        expect(advance.body.phase).toBeDefined();
    });
    it('audits deal', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get(`/api/deals/${dealId}/audit`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('compliant');
    });
    it('scores an offer and compares offers', async () => {
        const s = await (0, supertest_1.default)(server_1.default).post('/api/offers/score').send({ price: 300000 });
        expect(s.status).toBe(200);
        const c = await (0, supertest_1.default)(server_1.default).post('/api/offers/compare').send({ offers: [{ price: 300000 }, { price: 310000 }] });
        expect(c.status).toBe(200);
        expect(Array.isArray(c.body)).toBeTruthy();
    });
    it('voice session end-to-end', async () => {
        const st = await (0, supertest_1.default)(server_1.default).post('/api/voice/start').send({ agentId: 'a1' });
        const sid = st.body.sessionId;
        await (0, supertest_1.default)(server_1.default).post(`/api/voice/${sid}/input`).send({ transcript: '123 Main St' });
        await (0, supertest_1.default)(server_1.default).post(`/api/voice/${sid}/input`).send({ transcript: 'John Buyer' });
        const rev = await (0, supertest_1.default)(server_1.default).get(`/api/voice/${sid}/review`);
        expect(rev.status).toBe(200);
        const fin = await (0, supertest_1.default)(server_1.default).post(`/api/voice/${sid}/finalize`);
        expect(fin.status).toBe(200);
    });
});
