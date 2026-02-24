import {
  createDeal as createDealRecord,
  deleteDeal as deleteDealRecord,
  getDeal as getDealRecord,
  listDeals as listDealsRecord,
  updateDeal as updateDealRecord,
  type DealRecord,
  type ListDealsOptions,
  type ListDealsResult,
  type UpdateDealInput
} from '../../lib/dataStore';

export type { DealRecord, CreateDealInput, UpdateDealInput, ListDealsResult } from '../../lib/dataStore';

export type DealsListQuery = {
  limit?: string | number;
  page?: string | number;
  status?: string;
  buyer_contact?: string;
  seller_contact?: string;
};

const toNumber = (value?: string | number): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export const createDealEndpoint = createDealRecord;

export const getDealEndpoint = async (id: string): Promise<DealRecord> => {
  const deal = await getDealRecord(id);
  if (!deal) {
    throw new Error('Deal not found.');
  }
  return deal;
};

export const updateDealEndpoint = updateDealRecord;

export const deleteDealEndpoint = deleteDealRecord;

export const listDealsEndpoint = async (query: DealsListQuery = {}): Promise<ListDealsResult> => {
  const options: ListDealsOptions = {
    limit: toNumber(query.limit),
    page: toNumber(query.page),
    status: query.status,
    buyer_contact: query.buyer_contact,
    seller_contact: query.seller_contact
  };
  return listDealsRecord(options);
};
