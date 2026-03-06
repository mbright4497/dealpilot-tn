"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEmail = exports.formatWhatsApp = exports.generateNotifications = void 0;
const daysBetween = (d1, d2) => Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
const generateNotifications = (tx, timelines, recipients, now = new Date()) => {
    const out = [];
    for (const dl of timelines) {
        const due = new Date(dl.due_date);
        const days = daysBetween(now, due);
        if (days === 7) {
            recipients.forEach(r => out.push({ transaction_id: tx.id, type: 'deadline_warning', recipient: r, channel: r.channel, message: `${dl.name} is 7 days away (${dl.due_date})`, urgency: 'warning', scheduled_at: now.toISOString() }));
        }
        if (days === 3) {
            recipients.forEach(r => out.push({ transaction_id: tx.id, type: 'deadline_warning', recipient: r, channel: r.channel, message: `${dl.name} is 3 days away (${dl.due_date})`, urgency: 'warning', scheduled_at: now.toISOString() }));
        }
        if (days === 1) {
            recipients.forEach(r => out.push({ transaction_id: tx.id, type: 'deadline_due', recipient: r, channel: r.channel, message: `${dl.name} is due tomorrow (${dl.due_date})`, urgency: 'critical', scheduled_at: now.toISOString() }));
        }
        if (days === 0) {
            recipients.forEach(r => out.push({ transaction_id: tx.id, type: 'deadline_due', recipient: r, channel: r.channel, message: `${dl.name} is due today (${dl.due_date})`, urgency: 'critical', scheduled_at: now.toISOString() }));
        }
        if (days < 0) {
            recipients.forEach(r => out.push({ transaction_id: tx.id, type: 'deadline_overdue', recipient: r, channel: r.channel, message: `${dl.name} is OVERDUE (was ${dl.due_date})`, urgency: 'critical', scheduled_at: now.toISOString() }));
        }
    }
    return out;
};
exports.generateNotifications = generateNotifications;
const formatWhatsApp = (n) => {
    const emoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };
    return `${emoji[n.urgency] || ''} ${n.message} — Deal ${n.transaction_id}`;
};
exports.formatWhatsApp = formatWhatsApp;
const formatEmail = (n) => {
    const subject = `[Deal ${n.transaction_id}] ${n.type}`;
    const text = `${n.message}\nDeal: ${n.transaction_id}`;
    const html = `<p>${n.message}</p><p>Deal: ${n.transaction_id}</p>`;
    return { subject, text, html };
};
exports.formatEmail = formatEmail;
exports.default = { generateNotifications: exports.generateNotifications, formatWhatsApp: exports.formatWhatsApp, formatEmail: exports.formatEmail };
