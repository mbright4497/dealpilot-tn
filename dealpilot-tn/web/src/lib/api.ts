const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const headers = (token?:string)=>({ 'Content-Type':'application/json', ...(token?{ Authorization:`Bearer ${token}` }: {}) });

export const get = async (path:string, token?:string)=> {
  const res = await fetch(`${API_URL}${path}`, { headers: headers(token) });
  return res.json();
};
export const post = async (path:string, body:any, token?:string)=>{
  const res = await fetch(`${API_URL}${path}`, { method:'POST', headers: headers(token), body: JSON.stringify(body) });
  return res.json();
};
export const patch = async (path:string, body:any, token?:string)=>{
  const res = await fetch(`${API_URL}${path}`, { method:'PATCH', headers: headers(token), body: JSON.stringify(body) });
  return res.json();
};
export const del = async (path:string, token?:string)=>{
  const res = await fetch(`${API_URL}${path}`, { method:'DELETE', headers: headers(token) });
  return res.json();
};
export default { get, post, patch, del };
