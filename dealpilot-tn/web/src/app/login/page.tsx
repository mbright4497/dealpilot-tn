export const dynamic = 'force-dynamic'

'use client'
import { useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';

export default function LoginPage(){
  const supabase = createBrowserSupabaseClient();
  const [email,setEmail]=useState('');
  const [pass,setPass]=useState('');
  const [msg,setMsg]=useState('');
  const handle = async ()=>{
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setMsg(String(error.message)); else setMsg('Logged in');
  };
  return (<div className="p-6 max-w-md mx-auto">
    <h1 className="text-xl font-bold">Sign in</h1>
    <input className="border p-2 w-full my-2" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
    <input className="border p-2 w-full my-2" placeholder="password" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
    <button className="bg-blue-600 text-white px-4 py-2" onClick={handle}>Sign in</button>
    <div className="mt-2">{msg}</div>
  </div>);
}
