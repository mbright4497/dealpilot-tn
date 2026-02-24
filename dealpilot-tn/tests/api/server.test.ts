import request from 'supertest';
import app from '../../src/server';

describe('Express API', ()=>{
  it('health check', async ()=>{
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBeTruthy();
  });

  it('create deal returns transaction', async ()=>{
    const res = await request(app).post('/api/deals').send({ deal_id:'t100', binding_agreement_date:'2026-03-01', context:{} });
    expect(res.status).toBe(200);
    expect(res.body.id).toEqual('t100');
  });

  it('score offer endpoint', async ()=>{
    const res = await request(app).post('/api/offers/score').send({ price:300000 });
    expect(res.status).toBe(200);
    expect(res.body.totalScore).toBeDefined();
  });

  it('voice session lifecycle', async ()=>{
    const start = await request(app).post('/api/voice/start').send({ agentId:'a1' });
    expect(start.status).toBe(200);
    const sid = start.body.sessionId;
    const in1 = await request(app).post(`/api/voice/${sid}/input`).send({ transcript:'123 Main St' });
    expect(in1.status).toBe(200);
    const review = await request(app).get(`/api/voice/${sid}/review`);
    expect(review.status).toBe(200);
  });
});
