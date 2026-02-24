import {
  createChecklist as createChecklistRecord,
  deleteChecklist as deleteChecklistRecord,
  getChecklist as getChecklistRecord,
  listChecklists as listChecklistsRecord,
  updateChecklist as updateChecklistRecord,
  type ChecklistRecord,
  type ListChecklistsOptions,
  type ListChecklistsResult,
  type UpdateChecklistInput
} from '../../lib/checklists';

export type { ChecklistRecord, CreateChecklistInput, UpdateChecklistInput, ListChecklistsResult } from '../../lib/checklists';

export type ChecklistsListQuery = {
  limit?: string | number;
  page?: string | number;
  deal_id?: string;
  status?: string;
};

const toNumber = (value?: string | number): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export const createChecklistEndpoint = createChecklistRecord;

export const getChecklistEndpoint = async (id: string): Promise<ChecklistRecord> => {
  const checklist = await getChecklistRecord(id);
  if (!checklist) {
    throw new Error('Checklist not found.');
  }
  return checklist;
};

export const updateChecklistEndpoint = updateChecklistRecord;

export const deleteChecklistEndpoint = deleteChecklistRecord;

export const listChecklistsEndpoint = async (query: ChecklistsListQuery = {}): Promise<ListChecklistsResult> => {
  const options: ListChecklistsOptions = {
    limit: toNumber(query.limit),
    page: toNumber(query.page),
    deal_id: query.deal_id,
    status: query.status
  };
  return listChecklistsRecord(options);
};
