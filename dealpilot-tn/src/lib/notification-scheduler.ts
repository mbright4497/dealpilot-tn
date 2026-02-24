import { generateNotifications } from './notification-engine-v2';
import type { Transaction } from '../types/transaction';
import type { Deadline } from '../types/timeline';

export const scanDealsForNotifications = (transactions: Transaction[], timelinesMap: Record<string, Deadline[]>, recipientsMap: Record<string, any[]>, now = new Date()) => {
  const all: any[] = [];
  const seen = new Set<string>();
  for (const tx of transactions) {
    const timelines = timelinesMap[tx.id] || [];
    const recipients = recipientsMap[tx.id] || [];
    const notes = generateNotifications(tx, timelines, recipients, now);
    for (const n of notes) {
      const key = `${n.transaction_id}:${n.type}:${n.recipient.contact_info}:${n.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(n);
    }
  }
  return all;
};

export default { scanDealsForNotifications };
