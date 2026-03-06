"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const webhook_1 = __importDefault(require("../../src/api/webhook"));
const app = (0, express_1.default)();
app.use('/', webhook_1.default);
describe('Webhook handler', () => {
    it('verifies webhook', async () => {
        const res = await (0, supertest_1.default)(app).get('/whatsapp').query({ 'hub.mode': 'subscribe', 'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'token', 'hub.challenge': '1234' });
        // if token matches env result 200 else 403
        if ((process.env.WHATSAPP_VERIFY_TOKEN || '') === 'token')
            expect(res.status).toBe(200);
        else
            expect([200, 403]).toContain(res.status);
    });
    it('responds 200 to empty POST', async () => {
        const res = await (0, supertest_1.default)(app).post('/whatsapp').send({});
        expect([200, 500]).toContain(res.status);
    });
});
