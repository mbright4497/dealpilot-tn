import type { Deadline } from '../types/timeline';
import type { Transaction } from '../types/transaction';
import type { NotificationRecord, Urgency } from '../types/notification';

export type NotificationType = 'deadline_warning'|'deadline_due'|'deadline_overdue'|'phase_change'|'document_needed'|'action_required'|'deal_update';
export type NotificationRecipient = { name:string; role: 'agent'|'buyer'|'seller'|'lender'|'title_company'|'other_agent'; channel: 'whatsapp'|'email'|'sms'|'in_app'; contact_info: string };
export type Notification = { id?:string; transaction_id: string; type: NotificationType; recipient: NotificationRecipient; channel: string; message: string; urgency: Urgency; scheduled_at?: string };

const daysBetween = (d1: Date, d2: Date) => Math.ceil((d2.getTime()-d1.getTime())/(1000*60*60*24));

export const generateNotifications = (tx: Transaction, timelines: Deadline[], recipients: NotificationRecipient[], now = new Date()): Notification[] => {
  const out: Notification[] = [];
  for (const dl of timelines) {
    const due = new Date(dl.due_date);
    const days = daysBetween(now, due);
    if (days === 7) {
      recipients.forEach(r=> out.push({ transaction_id: tx.id, type: 'deadline_warning', recipient: r, channel: r.channel, message: `${dl.name} is 7 days away (${dl.due_date})`, urgency: 'warning', scheduled_at: now.toISOString() }));
    }
    if (days === 3) {
      recipients.forEach(r=> out.push({ transaction_id: tx.id, type: 'deadline_warning', recipient: r, channel: r.channel, message: `${dl.name} is 3 days away (${dl.due_date})`, urgency: 'warning', scheduled_at: now.toISOString() }));
    }
    if (days === 1) {
      recipients.forEach(r=> out.push({ transaction_id: tx.id, type: 'deadline_due', recipient: r, channel: r.channel, message: `${dl.name} is due tomorrow (${dl.due_date})`, urgency: 'critical', scheduled_at: now.toISOString() }));
    }
    if (days === 0) {
      recipients.forEach(r=> out.push({ transaction_id: tx.id, type: 'deadline_due', recipient: r, channel: r.channel, message: `${dl.name} is due today (${dl.due_date})`, urgency: 'critical', scheduled_at: now.toISOString() }));
    }
    if (days < 0) {
      recipients.forEach(r=> out.push({ transaction_id: tx.id, type: 'deadline_overdue', recipient: r, channel: r.channel, message: `${dl.name} is OVERDUE (was ${dl.due_date})`, urgency: 'critical', scheduled_at: now.toISOString() }));
    }
  }
  return out;
};

export const formatWhatsApp = (n: Notification) => {
  const emoji: Record<Urgency,string> = { info:'ℹ️', warning:'⚠️', critical:'🚨' } as any;
  return `${emoji[n.urgency] || ''} ${n.message} — Deal ${n.transaction_id}`;
};

export const formatEmail = (n: Notification) => {
  const subject = `[Deal ${n.transaction_id}] ${n.type}`;
  const text = `${n.message}\nDeal: ${n.transaction_id}`;
  const html = `<p>${n.message}</p><p>Deal: ${n.transaction_id}</p>`;
  return { subject, text, html };
};

export default { generateNotifications, formatWhatsApp, formatEmail };
