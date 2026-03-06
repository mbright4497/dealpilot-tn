"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistNotification = exports.evaluateRules = exports.formatWhatsApp = exports.TEMPLATES = void 0;
const supabase_1 = require("./supabase");
const TABLE = 'notifications';
exports.TEMPLATES = {
    'loan-3day-approach': 'Loan application deadline approaching for {{deal_id}}: {{deadline_name}} due {{due_date}} ({{days}} days left).',
    '14day-approach': '14-day obligations coming up for {{deal_id}}: {{deadline_name}} due {{due_date}} ({{days}} days left).',
    'inspection-2day': 'Inspection period ending in 2 days for {{deal_id}}: {{deadline_name}} due {{due_date}}.',
    'closing-countdown': 'Closing in {{days}} days for {{deal_id}}: {{deadline_name}} due {{due_date}}.',
    'missed-deadline': 'Missed deadline for {{deal_id}}: {{deadline_name}} was due {{due_date}}. Next step: {{detail}}',
    'nov-decision-window': 'Appraisal NOV decision window: {{deal_id}} needs buyer decision by {{due_date}} ({{days}} days left).'
};
const formatWhatsApp = (payload) => {
    const emoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };
    const e = emoji[payload.urgency];
    let text = `${e} `;
    if (payload.deadline_name)
        text += `${payload.deadline_name} — `;
    if (payload.days_remaining !== undefined)
        text += `In ${payload.days_remaining} days. `;
    if (payload.due_date)
        text += `Due: ${payload.due_date}. `;
    if (payload.detail)
        text += `${payload.detail}`;
    text += ` (Deal ${payload.deal_id})`;
    return text;
};
exports.formatWhatsApp = formatWhatsApp;
const evaluateRules = (rules, deadlines) => {
    const notices = [];
    const today = new Date();
    for (const dl of deadlines) {
        const due = new Date(dl.due_date);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        for (const r of rules) {
            if (r.trigger === 'approaching' && r.params?.days && diffDays === r.params.days) {
                notices.push({ deal_id: dl.deal_id, deadline_name: dl.name, due_date: dl.due_date, days_remaining: diffDays, urgency: r.params?.urgency || 'warning' });
            }
            if (r.trigger === 'missed' && diffDays < 0) {
                notices.push({ deal_id: dl.deal_id, deadline_name: dl.name, due_date: dl.due_date, days_remaining: diffDays, urgency: r.params?.urgency || 'critical', detail: r.params?.detail || 'Please take action' });
            }
        }
    }
    return notices;
};
exports.evaluateRules = evaluateRules;
const persistNotification = async (note) => {
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE).insert({ ...note, sent_at: note.sent_at || null }).select('*').single();
    if (error)
        throw error;
    return data;
};
exports.persistNotification = persistNotification;
exports.default = { TEMPLATES: exports.TEMPLATES, formatWhatsApp: exports.formatWhatsApp, evaluateRules: exports.evaluateRules, persistNotification: exports.persistNotification };
