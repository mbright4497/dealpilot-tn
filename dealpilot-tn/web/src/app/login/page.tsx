'use client'
import { useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';

export default function LoginPage(){
  const supabase = createBrowserSupabaseClient();
  const [email,setEmail]=useState('');
  const [pass,setPass]=useState('');
  const [msg,setMsg]=useState('');
  const [loading,setLoading]=useState(false);
  const handle = async ()=>{
    setLoading(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setMsg(String(error.message)); setLoading(false); } else {
      setMsg('Logged in');
      window.location.href = '/dashboard';
    }
  };
  return (
    <div className="dp-login-container">
      <div className="dp-login-card">
        <div style={{display:'flex',justifyContent:'center',marginBottom:'1.5rem'}}>
          <div className="dp-robot" style={{width:56,height:56,fontSize:'1.8rem'}}>
            <span role="img" aria-label="robot">{String.fromCodePoint(0x1F916)}</span>
          </div>
        </div>
        <h1>Welcome Back</h1>
        <div className="dp-subtitle">Sign in to DealPilot TN</div>
        <div>
          <label style={{display:'block',fontSize:'0.8rem',fontWeight:600,color:'var(--muted)',marginBottom:'0.375rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>Email</label>
          <input placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label style={{display:'block',fontSize:'0.8rem',fontWeight:600,color:'var(--muted)',marginBottom:'0.375rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>Password</label>
          <input type="password" placeholder="Enter your password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} />
        </div>
        <button onClick={handle} disabled={loading} style={{opacity:loading?0.7:1,marginTop:'0.5rem'}}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        {msg && <div style={{marginTop:'1rem',textAlign:'center',fontSize:'0.85rem',color:msg==='Logged in'?'var(--success)':'var(--danger)'}}>{msg}</div>}
      </div>
    </div>
  );
}
