import request from 'supertest';
import app from '../../src/server';

describe('Integration: deal lifecycle', () => {
  let dealId = `deal-${Date.now()}`;

  it('creates a deal and returns transaction', async () => {
    const res = await request(app).post('/api/deals').send({ deal_id: dealId, binding_agreement_date: '2026-03-01', context: {} });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  it('advances through phases and triggers CRM sync (non-blocking)', async () => {
    const advance = await request(app).put(`/api/deals/${dealId}/advance`).send({ event: 'toInspection', checklist_completed: ['inspection_completed'] });
    expect(advance.status).toBe(200);
    expect(advance.body.phase).toBeDefined();
  });

  it('audits deal', async () => {
    const res = await request(app).get(`/api/deals/${dealId}/audit`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('compliant');
  });

  it('scores an offer and compares offers', async () => {
    const s = await request(app).post('/api/offers/score').send({ price: 300000 });
    expect(s.status).toBe(200);
    const c = await request(app).post('/api/offers/compare').send({ offers: [{ price:300000 }, { price:310000 }] });
    expect(c.status).toBe(200);
    expect(Array.isArray(c.body)).toBeTruthy();
  });

  it('voice session end-to-end', async () => {
    const st = await request(app).post('/api/voice/start').send({ agentId: 'a1' });
    const sid = st.body.sessionId;
    await request(app).post(`/api/voice/${sid}/input`).send({ transcript: '123 Main St' });
    await request(app).post(`/api/voice/${sid}/input`).send({ transcript: 'John Buyer' });
    const rev = await request(app).get(`/api/voice/${sid}/review`);
    expect(rev.status).toBe(200);
    const fin = await request(app).post(`/api/voice/${sid}/finalize`);
    expect(fin.status).toBe(200);
  });
});
