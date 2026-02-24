import type { RF656TriggerContext } from '../../src/types';
import { createSupabaseMock, type SupabaseMockContext } from '../helpers/supabaseMock';

let supabaseMock: SupabaseMockContext | undefined;

jest.mock('../../src/lib/supabase', () => {
  supabaseMock = createSupabaseMock();
  return {
    supabaseAdmin: {
      from: supabaseMock!.fromMock
    }
  };
});

const { logTriggerEvaluations } = require('../../src/lib/rules/rf656');

const getContext = (): SupabaseMockContext => {
  if (!supabaseMock) {
    throw new Error('Supabase mock was not initialized');
  }
  return supabaseMock;
};

describe('logTriggerEvaluations', () => {
  beforeEach(() => {
    getContext().reset();
  });

  it('records a check entry when no rules match', async () => {
    const matches = await logTriggerEvaluations('deal-1', {});
    expect(matches).toEqual([]);
    expect(getContext().insertMock).toHaveBeenCalledWith({
      deal_id: 'deal-1',
      actor: 'rf656-engine',
      action: 'rf656-trigger-check',
      detail: {
        notice_code: undefined,
        triggered: []
      }
    });
  });

  it('inserts one record per triggered rule', async () => {
    const context: RF656TriggerContext = {
      rf656: {
        notice_type_code: 'low_appraisal',
        notification_types: {
          low_appraisal: true
        }
      }
    };

    const matches = await logTriggerEvaluations('deal-2', context);

    expect(matches).toHaveLength(1);
    expect(getContext().insertMock).toHaveBeenCalledTimes(1);

    const insertedPayload = getContext().insertMock.mock.calls[0][0];
    expect(Array.isArray(insertedPayload)).toBe(true);
    expect(insertedPayload).toHaveLength(matches.length);
    expect(insertedPayload[0]).toEqual({
      deal_id: 'deal-2',
      actor: 'rf656-engine',
      action: 'rf656-triggered',
      detail: {
        rule: matches[0].name,
        notice: matches[0].recommendedNotice,
        box: matches[0].boxNumber
      }
    });
  });
});
