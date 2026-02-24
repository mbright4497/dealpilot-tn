import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dealsApi from './api/deals';
import offersApi from './api/offers';
import voiceApi from './api/voice';
import webhook from './api/webhook';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req,res)=>res.json({ok:true, time: new Date().toISOString()}));

app.use('/api/deals', dealsApi);
app.use('/api/offers', offersApi);
app.use('/api/voice', voiceApi);
app.use('/whatsapp', webhook);

// error handler
app.use((err:any, req:any, res:any, next:any)=>{
  console.error('server error', err);
  res.status(500).json({ error: 'server_error', details: [String(err.message || err)] });
});

const port = process.env.PORT || 3000;
const server = app.listen(port, ()=>console.log(`DealPilot API listening ${port}`));

const shutdown = () => { server.close(()=>process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
