"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_engine_1 = require("../../src/lib/notification-engine");
const notification_rules_1 = __importDefault(require("../../src/data/notification-rules"));
describe('Notification Engine', () => {
    const today = new Date();
    const makeDue = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
    };
    it('evaluates approaching rules', () => {
        const deadlines = [{ deal_id: 'd1', name: 'Loan application + credit report', due_date: makeDue(2) }];
        const notices = (0, notification_engine_1.evaluateRules)(notification_rules_1.default, deadlines);
        expect(notices.length).toBeGreaterThan(0);
        expect(notices[0].deadline_name).toContain('Loan');
    });
    it('formats WhatsApp messages with emoji', () => {
        const payload = { deal_id: 'd1', deadline_name: 'Test', due_date: makeDue(2), days_remaining: 2, urgency: 'warning' };
        const msg = (0, notification_engine_1.formatWhatsApp)(payload);
        expect(msg).toContain('⚠️');
        expect(msg).toContain('Deal d1');
    });
    it('detects missed deadlines', () => {
        const deadlines = [{ deal_id: 'd2', name: 'Past due', due_date: makeDue(-2) }];
        const notices = (0, notification_engine_1.evaluateRules)(notification_rules_1.default, deadlines);
        expect(notices.some(n => n.urgency === 'critical')).toBeTruthy();
    });
});
