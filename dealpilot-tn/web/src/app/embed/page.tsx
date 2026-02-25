'use client'
import React, { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';

function RobotSVG({ talking }: { talking: boolean }) {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 0 12px rgba(79,140,255,0.5))'}}>
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f8cff"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
      </defs>
      {/* Antenna */}
      <line x1="40" y1="8" x2="40" y2="18" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="40" cy="6" r="3" fill="#4f8cff">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/>
      </circle>
      {/* Head */}
      <rect x="20" y="18" width="40" height="28" rx="8" fill="url(#bodyGrad)"/>
      {/* Eyes */}
      <circle cx="31" cy="30" r="4" fill="#0a0e1a">
        <animate attributeName="r" values="4;3.5;4" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="49" cy="30" r="4" fill="#0a0e1a">
        <animate attributeName="r" values="4;3.5;4" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="32" cy="29" r="1.5" fill="#4f8cff"/>
      <circle cx="50" cy="29" r="1.5" fill="#4f8cff"/>
      {/* Mouth */}
      {talking ? (
        <rect x="32" y="39" width="16" height={4} rx="2" fill="#0a0e1a">
          <animate attributeName="height" values="4;7;3;6;4" dur="0.5s" repeatCount="indefinite"/>
          <animate attributeName="y" values="39;37;40;38;39" dur="0.5s" repeatCount="indefinite"/>
        </rect>
      ) : (
        <path d="M32 41 Q40 46 48 41" stroke="#0a0e1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      )}
      {/* Neck */}
      <rect x="36" y="46" width="8" height="6" rx="2" fill="#3a4a7a"/>
      {/* Body */}
      <rect x="16" y="52" width="48" height="22" rx="8" fill="url(#bodyGrad)" opacity="0.9"/>
      {/* Chest panel */}
      <rect x="26" y="57" width="28" height="12" rx="4" fill="rgba(10,14,26,0.5)"/>
      <circle cx="34" cy="63" r="3" fill="#22c55e">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <rect x="40" y="60" width="10" height="2" rx="1" fill="#4f8cff" opacity="0.8"/>
      <rect x="40" y="64" width="7" height="2" rx="1" fill="#a855f7" opacity="0.8"/>
      {/* Arms */}
      <rect x="4" y="54" width="12" height="6" rx="3" fill="url(#bodyGrad)" opacity="0.8"/>
      <rect x="64" y="54" width="12" height="6" rx="3" fill="url(#bodyGrad)" opacity="0.8"/>
    </svg>
  );
}

export default function EmbedPage(){
  const [stats, setStats] = useState({ contacts: 0, deals: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [talking, setTalking] = useState(false);
  const [message, setMessage] = useState('Hello! I am DealPilot AI. Ready to help you close more deals.');

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const [c, d] = await Promise.all([
          supabase.from('contacts').select('id', { count: 'exact', head: true }),
          supabase.from('deals').select('id, status'),
        ]);
        const deals = d.data || [];
        setStats({
          contacts: c.count || 0,
          deals: deals.length,
          active: deals.filter((x: any) => x.status === 'active').length,
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) {
      setTalking(true);
      setMessage(`Welcome back! You have ${stats.contacts} contacts and ${stats.active} active deals.`);
      const t = setTimeout(() => setTalking(false), 3000);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleRobotClick = () => {
    const msgs = [
      'Need help scoring an offer? Try the Deal Pipeline!',
      'Check your RF401 contract guide anytime.',
      'Open the full dashboard for more tools.',
      `You have ${stats.active} active deals right now!`,
      'Keller Williams agents get the best of both worlds!',
    ];
    setMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    setTalking(true);
    setTimeout(() => setTalking(false), 3000);
  };

  return (
    <div className="dp-embed" style={{fontFamily:'Inter,-apple-system,sans-serif',color:'var(--foreground)',background:'var(--background)',minHeight:'100vh',padding:'1.25rem'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1.25rem',paddingBottom:'1rem',borderBottom:'1px solid var(--border)'}}>
        <div>
          <div style={{fontSize:'1rem',fontWeight:700,color:'var(--foreground)'}}>DealPilot AI</div>
          <div style={{fontSize:'0.7rem',color:'var(--muted)'}}>Your KW Agent Tool</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:'0.5rem'}}>
          {['overview','contacts','deals'].map(v => (
            <button key={v} onClick={()=>setView(v)} style={{padding:'0.375rem 0.75rem',borderRadius:6,border:'1px solid var(--border)',background:view===v?'var(--accent-glow)':'transparent',color:view===v?'var(--accent)':'var(--muted)',cursor:'pointer',fontSize:'0.8rem',fontWeight:500,textTransform:'capitalize',transition:'all 0.2s'}}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'overview' && (
        <div>
          {/* Stat cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',marginBottom:'1.25rem'}}>
            <div className="dp-stat" style={{padding:'1rem'}}>
              <div style={{fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)'}}>Contacts</div>
              <div className="dp-stat-value" style={{fontSize:'1.5rem'}}>{loading ? '...' : stats.contacts}</div>
            </div>
            <div className="dp-stat" style={{padding:'1rem'}}>
              <div style={{fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)'}}>Active</div>
              <div className="dp-stat-value" style={{fontSize:'1.5rem'}}>{loading ? '...' : stats.active}</div>
            </div>
            <div className="dp-stat" style={{padding:'1rem'}}>
              <div style={{fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)'}}>Deals</div>
              <div className="dp-stat-value" style={{fontSize:'1.5rem'}}>{loading ? '...' : stats.deals}</div>
            </div>
          </div>

          {/* Talking Robot */}
          <div className="dp-card" style={{display:'flex',alignItems:'center',gap:'1.25rem',padding:'1.25rem',cursor:'pointer',background:'linear-gradient(135deg,rgba(79,140,255,0.08),rgba(168,85,247,0.08))',border:'1px solid rgba(79,140,255,0.25)'}} onClick={handleRobotClick}>
            <div style={{flexShrink:0,transition:'transform 0.2s'}}>
              <RobotSVG talking={talking} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:'0.9rem',marginBottom:'0.5rem',color:'var(--foreground)'}}>DealPilot AI Assistant</div>
              <div style={{background:'rgba(10,14,26,0.6)',border:'1px solid var(--border)',borderRadius:10,padding:'0.625rem 0.875rem',fontSize:'0.82rem',color:'var(--foreground)',lineHeight:1.5,minHeight:'2.5rem',transition:'all 0.3s'}}>
                {message}
              </div>
              <div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.375rem'}}>Click the robot to get tips</div>
            </div>
          </div>

          <a href="/dashboard" target="_blank" rel="noopener" style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',marginTop:'1rem',padding:'0.5rem 1.25rem',background:'linear-gradient(135deg,var(--gradient-start),var(--gradient-end))',color:'white',borderRadius:8,fontSize:'0.85rem',fontWeight:600,textDecoration:'none',boxShadow:'0 4px 16px rgba(79,140,255,0.3)'}}>
            Open Full Dashboard
          </a>
        </div>
      )}
      {view === 'contacts' && <ContactsEmbed />}
      {view === 'deals' && <DealsEmbed />}
    </div>
  );
}

function ContactsEmbed(){
  const [contacts, setContacts] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from('contacts').select('*').order('created_at',{ascending:false}).limit(10);
      setContacts(data || []);
    };
    load();
  }, []);
  return (
    <div>
      <div style={{fontSize:'0.9rem',fontWeight:600,marginBottom:'0.75rem'}}>Recent Contacts</div>
      {contacts.map((c:any) => (
        <div key={c.id} className="dp-card" style={{marginBottom:'0.5rem',padding:'0.75rem',display:'flex',justifyContent:'space-between'}}>
          <div style={{fontWeight:500,fontSize:'0.85rem'}}>{c.name}</div>
          <div style={{color:'var(--muted)',fontSize:'0.8rem'}}>{c.phone}</div>
        </div>
      ))}
      {contacts.length === 0 && <div style={{color:'var(--muted)',fontSize:'0.85rem'}}>No contacts yet</div>}
    </div>
  );
}

function DealsEmbed(){
  const [deals, setDeals] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from('deals').select('*').order('created_at',{ascending:false}).limit(10);
      setDeals(data || []);
    };
    load();
  }, []);
  return (
    <div>
      <div style={{fontSize:'0.9rem',fontWeight:600,marginBottom:'0.75rem'}}>Recent Deals</div>
      {deals.map((d:any) => (
        <div key={d.id} className="dp-card" style={{marginBottom:'0.5rem',padding:'0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:500,fontSize:'0.85rem'}}>{d.title}</div>
            <div style={{color:'var(--muted)',fontSize:'0.75rem'}}>${d.value?.toLocaleString()}</div>
          </div>
          <div style={{padding:'0.25rem 0.625rem',borderRadius:12,fontSize:'0.7rem',fontWeight:600,background:d.status==='active'?'rgba(34,197,94,0.15)':'rgba(107,115,148,0.15)',color:d.status==='active'?'var(--success)':'var(--muted)'}}>{d.status}</div>
        </div>
      ))}
      {deals.length === 0 && <div style={{color:'var(--muted)',fontSize:'0.85rem'}}>No deals yet</div>}
    </div>
  );
}
