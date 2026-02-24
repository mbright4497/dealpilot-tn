export type Urgency = 'info'|'warning'|'critical';

export type NotificationRule = {
  id: string;
  name: string;
  trigger: 'approaching'|'missed'|'status_changed'|'document_needed';
  params?: any;
  template: string;
};

export type NotificationPayload = {
  deal_id: string;
  deadline_name?: string;
  due_date?: string;
  days_remaining?: number;
  urgency: Urgency;
  detail?: string;
};

export type NotificationRecord = {
  id?: string;
  deal_id: string;
  recipient: string;
  channel: string;
  template: string;
  payload: NotificationPayload;
  sent_at?: string;
  status?: string;
};
