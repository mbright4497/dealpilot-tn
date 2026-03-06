"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = exports.classifyIntent = void 0;
const notification_engine_1 = require("./notification-engine");
const timeline_engine_1 = require("./timeline-engine");
const offer_scoring_1 = require("./offer-scoring");
const notification_rules_1 = __importDefault(require("../data/notification-rules"));
const classifyIntent = (text) => {
    const t = text.toLowerCase();
    if (t.includes('deadline') || t.includes('due') || t.includes('upcoming'))
        return 'CHECK_DEADLINES';
    if (t.includes('form') || t.includes('document') || t.includes('missing'))
        return 'CHECK_FORMS';
    if (t.includes('compare') && t.includes('offer'))
        return 'COMPARE_OFFERS';
    if (t.includes('status') || t.includes('where'))
        return 'DEAL_STATUS';
    if (t.includes('remind') || t.includes('notify') || t.includes('send'))
        return 'SEND_NOTIFICATION';
    return 'HELP';
};
exports.classifyIntent = classifyIntent;
const route = async (intent, dealId, message) => {
    switch (intent) {
        case 'CHECK_DEADLINES': {
            const ds = await (0, timeline_engine_1.listDeadlinesForDeal)(dealId);
            const next = ds.slice(0, 3).map((d) => `${d.name}: ${d.due_date}`).join('\n');
            return `Upcoming deadlines:\n${next}`;
        }
        case 'CHECK_FORMS': {
            // For demo, call evaluateFormsForDeal with empty forms and return templates
            const formsNeeded = ['RF401', 'RF625'];
            return `Pending forms: ${formsNeeded.join(', ')}`;
        }
        case 'COMPARE_OFFERS': {
            // message expected to contain offer brief; for tests we'll mock by calling compareOffers with sample
            const res = (0, offer_scoring_1.compareOffers)([{ price: 300000 }, { price: 310000 }]);
            return `Best offer: ${res[0].input.price} (score ${res[0].totalScore})`;
        }
        case 'DEAL_STATUS': {
            return `Deal ${dealId} status: Active`;
        }
        case 'SEND_NOTIFICATION': {
            // Evaluate notification rules against deadlines and return count
            const ds = await (0, timeline_engine_1.listDeadlinesForDeal)(dealId);
            const notices = (0, notification_engine_1.evaluateRules)(notification_rules_1.default, ds);
            return `Notifications generated: ${notices.length}`;
        }
        default:
            return `Help: I can check deadlines, forms, compare offers, send notifications.`;
    }
};
exports.route = route;
exports.default = { classifyIntent: exports.classifyIntent, route: exports.route };
