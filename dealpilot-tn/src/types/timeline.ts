export type Deadline = {
  id?: string;
  deal_id: string;
  name: string;
  due_date: string; // ISO date
  category?: string;
  owner?: string;
  metadata?: Record<string, any>;
  completed?: boolean;
};

export type BADates = {
  binding_date: string; // ISO
};
