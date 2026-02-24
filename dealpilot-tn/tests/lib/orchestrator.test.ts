import { classifyIntent, route } from '../../src/lib/conversation-router';
import orchestrator from '../../src/lib/agent-orchestrator';

describe('Conversation Router', () => {
  it('classifies deadlines intent', () => {
    expect(classifyIntent('what is due next?')).toEqual('CHECK_DEADLINES');
    expect(classifyIntent('any upcoming deadlines?')).toEqual('CHECK_DEADLINES');
  });
  it('classifies forms intent', () => {
    expect(classifyIntent('which documents are missing?')).toEqual('CHECK_FORMS');
  });
  it('classifies compare offers', () => {
    expect(classifyIntent('compare these offers')).toEqual('COMPARE_OFFERS');
  });
});

describe('Agent Orchestrator', () => {
  it('routes CHECK_DEADLINES and returns string', async () => {
    const res = await route('CHECK_DEADLINES','deal-1','what is due');
    expect(typeof res).toEqual('string');
  });

  it('orchestrate logs and responds', async () => {
    const resp = await orchestrator.orchestrate('deal-1','agent:1','what is due next');
    expect(typeof resp).toEqual('string');
  });
});
