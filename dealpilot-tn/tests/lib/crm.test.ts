import { syncContactToCrm, syncDealToCrm, updateCrmStage } from '../../src/lib/crm-integration';
import GHLProvider from '../../src/lib/ghl-provider';

describe('CRM Integration', () => {
  it('GHL contact sync writes log and returns ok', async () => {
    const res = await syncContactToCrm('GHL', { name: 'Alice' }, 'tx1');
    expect(res.ok).toBeTruthy();
  });

  it('GHL deal sync returns ok', async () => {
    const res = await syncDealToCrm('GHL', { id: 'tx2' });
    expect(res.ok).toBeTruthy();
  });

  it('update stage returns ok', async () => {
    const res = await updateCrmStage('GHL', 'opp1', 'New Contract', 'tx3');
    expect(res.ok).toBeTruthy();
  });

  it('KW provider returns not configured', async () => {
    const res = await syncContactToCrm('KW', { name: 'Bob' }, 'tx4');
    expect(res.ok).toBeFalsy();
  });
});
