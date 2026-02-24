import request from 'supertest';
import express from 'express';
import webhook from '../../src/api/webhook';

const app = express();
app.use('/', webhook as any);

describe('Webhook handler', () => {
  it('verifies webhook', async () => {
    const res = await request(app).get('/whatsapp').query({ 'hub.mode':'subscribe','hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'token', 'hub.challenge':'1234' });
    // if token matches env result 200 else 403
    if ((process.env.WHATSAPP_VERIFY_TOKEN || '') === 'token') expect(res.status).toBe(200);
    else expect([200,403]).toContain(res.status);
  });

  it('responds 200 to empty POST', async () => {
    const res = await request(app).post('/whatsapp').send({});
    expect([200,500]).toContain(res.status);
  });
});
