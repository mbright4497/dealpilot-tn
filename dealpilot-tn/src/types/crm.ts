export type CrmSystem = 'GHL'|'KW';
export type CrmProviderName = 'GHLProvider'|'KWCommandProvider';

export type CrmProvider = {
  syncContact: (contact: any) => Promise<any>;
  syncDeal: (transaction: any) => Promise<any>;
  updateStage: (opportunityId: string, stage: string) => Promise<any>;
  getContact: (contactId: string) => Promise<any>;
};

export type CrmSyncEvent = 'contact_synced'|'deal_synced'|'stage_updated';
export type CrmSyncLog = {
  id?: string;
  transaction_id?: string;
  crm_system: CrmSystem;
  operation: CrmSyncEvent;
  request_payload?: any;
  response_status?: number;
  error_message?: string;
  created_at?: string;
};
