import fetch from 'node-fetch'
import { createBrowserClient } from './supabase-browser'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const API_KEY = process.env.GHL_API_KEY || ''
const LOCATION_ID = process.env.GHL_LOCATION_ID || ''

function headers(){
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    'X-Location-Id': LOCATION_ID,
  }
}

async function retryFetch(url:string, opts:any, retries=2){
  try{
    const res = await fetch(url, opts)
    if(!res.ok) throw new Error('Fetch failed '+res.status)
    return res
  }catch(e){
    if(retries>0) return retryFetch(url, opts, retries-1)
    throw e
  }
}

export async function findOrCreateContact(name:string, phone?:string, email?:string){
  // try find by phone then email
  if(!API_KEY) throw new Error('GHL_API_KEY not configured')
  try{
    if(phone){
      const q = encodeURIComponent(phone)
      const res = await retryFetch(`${GHL_BASE}/contacts?phone=${q}`, { headers: headers() })
      const j = await res.json()
      if(Array.isArray(j) && j.length>0) return j[0]
    }
    if(email){
      const q = encodeURIComponent(email)
      const res = await retryFetch(`${GHL_BASE}/contacts?email=${q}`, { headers: headers() })
      const j = await res.json()
      if(Array.isArray(j) && j.length>0) return j[0]
    }
    // create
    const createRes = await retryFetch(`${GHL_BASE}/contacts`, { method: 'POST', headers: headers(), body: JSON.stringify({ name, phone, email, location_id: LOCATION_ID }) })
    return await createRes.json()
  }catch(e){ throw e }
}

export async function getConversation(contactId:string){
  if(!API_KEY) throw new Error('GHL_API_KEY not configured')
  const res = await retryFetch(`${GHL_BASE}/conversations/${contactId}/messages`, { headers: headers() })
  return res.json()
}

export async function sendSmsViaGhl(contactId:string, message:string){
  if(!API_KEY) throw new Error('GHL_API_KEY not configured')
  const payload = { to: contactId, message, location_id: LOCATION_ID, channel: 'sms' }
  const res = await retryFetch(`${GHL_BASE}/conversations/messages`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) })
  return res.json()
}

export async function sendEmailViaGhl(contactId:string, subject:string, body:string){
  if(!API_KEY) throw new Error('GHL_API_KEY not configured')
  const payload = { to: contactId, subject, body, location_id: LOCATION_ID, channel: 'email' }
  const res = await retryFetch(`${GHL_BASE}/conversations/messages`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) })
  return res.json()
}
