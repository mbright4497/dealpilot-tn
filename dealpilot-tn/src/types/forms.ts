export type DealContext = {
  deal_id: string;
  price?: number;
  buyer_credit_score?: number;
  timeline_days?: number;
  contingencies?: string[];
  metadata?: Record<string, any>;
};

export type FormDefinition = {
  id: string; // e.g., RF401
  name: string;
  fields: { name: string; type: string }[];
};

export type FormRule = {
  id: string;
  formId: string;
  name: string;
  condition: (context: DealContext, formValues: Record<string, any>) => boolean;
  action?: (context: DealContext, formValues: Record<string, any>) => any;
};

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
