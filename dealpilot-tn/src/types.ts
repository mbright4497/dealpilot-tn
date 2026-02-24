export type TimelineEvent = {
  id: string;
  name: string;
  due_date: string;
  tags?: string[];
  owner?: string;
  metadata?: Record<string, any>;
  description?: string;
  source_form?: string;
};

export type RF656TriggerContext = any;
