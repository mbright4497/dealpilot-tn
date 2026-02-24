import type { NotificationRule } from '../types/notification';

export const NOTIFICATION_RULES: NotificationRule[] = [
  { id: 'r1', name: 'Loan 3-day approach', trigger: 'approaching', params: { days: 2, urgency: 'warning' }, template: 'loan-3day-approach' },
  { id: 'r2', name: '14-day approach', trigger: 'approaching', params: { days: 10, urgency: 'warning' }, template: '14day-approach' },
  { id: 'r3', name: 'Inspection 2-day', trigger: 'approaching', params: { days: 2, urgency: 'warning' }, template: 'inspection-2day' },
  { id: 'r4', name: 'Closing countdown', trigger: 'approaching', params: { days: 30, urgency: 'info' }, template: 'closing-countdown' },
  { id: 'r5', name: 'Missed deadline', trigger: 'missed', params: { urgency: 'critical', detail: 'Contact agent immediately' }, template: 'missed-deadline' },
  { id: 'r6', name: 'NOV decision', trigger: 'approaching', params: { days: 3, urgency: 'warning' }, template: 'nov-decision-window' }
];

export default NOTIFICATION_RULES;
