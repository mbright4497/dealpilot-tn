import type { NotificationRule, NotificationPayload, NotificationRecord, Urgency } from '../types/notification';
import { supabaseAdmin } from './supabase';

const TABLE = 'notifications';

export const TEMPLATES: Record<string, string> = {
  'loan-3day-approach': 'Loan application deadline approaching for {{deal_id}}: {{deadline_name}} due {{due_date}} ({{days}} days left).',
  '14day-approach': '14-day obligations coming up for {{deal_id}}: {{deadline_name}} due {{due_date}} ({{days}} days left).',
  'inspection-2day': 'Inspection period ending in 2 days for {{deal_id}}: {{deadline_name}} due {{due_date}}.',
  'closing-countdown': 'Closing in {{days}} days for {{deal_id}}: {{deadline_name}} due {{due_date}}.',
  'missed-deadline': 'Missed deadline for {{deal_id}}: {{deadline_name}} was due {{due_date}}. Next step: {{detail}}',
  'nov-decision-window': 'Appraisal NOV decision window: {{deal_id}} needs buyer decision by {{due_date}} ({{days}} days left).'
};

export const formatWhatsApp = (payload: NotificationPayload) => {
  const emoji: Record<Urgency,string> = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };
  const e = emoji[payload.urgency];

  let text = `${e} `;
  if (payload.deadline_name) text += `${payload.deadline_name} — `;
  if (payload.days_remaining !== undefined) text += `In ${payload.days_remaining} days. `;
  if (payload.due_date) text += `Due: ${payload.due_date}. `;
  if (payload.detail) text += `${payload.detail}`;
  text += ` (Deal ${payload.deal_id})`;
  return text;
};

export const evaluateRules = (rules: NotificationRule[], deadlines: any[]) => {
  const notices: NotificationPayload[] = [];
  const today = new Date();
  for (const dl of deadlines) {
    const due = new Date(dl.due_date);
    const diffDays = Math.ceil((due.getTime() - today.getTime())/(1000*60*60*24));
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

export const persistNotification = async (note: NotificationRecord) => {
  const { data, error } = await supabaseAdmin.from(TABLE).insert({ ...note, sent_at: note.sent_at || null }).select('*').single();
  if (error) throw error;
  return data;
};

export default { TEMPLATES, formatWhatsApp, evaluateRules, persistNotification };
