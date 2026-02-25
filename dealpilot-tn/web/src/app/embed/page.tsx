'use client'
import React, { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../../../lib/supabase';

export default function EmbedPage(){
  const [stats, setStats] = useState({ contacts: 0, deals: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');

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

  return (
    <div className="dp-embed" style={{fontFamily:'Inter,-apple-system,sans-serif',color:'var(--foreground)',background:'var(--background)',minHeight:'100vh',padding:'1.5rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1.5rem'}}>
        <div className="dp-robot" style={{width:40,height:40,fontSize:'1.2rem'}}>
          <span role="img" aria-label="robot">{String.fromCodePoint(0x1F916)}</span>
        </div>
        <div>
          <div style={{fontSize:'1rem',fontWeight:700,color:'var(--foreground)'}}>DealPilot AI</div>
          <div style={{fontSize:'0.7rem',color:'var(--muted)'}}>Agent Tool</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:'0.5rem'}}>
          {['overview','contacts','deals'].map(v => (
            <button key={v} onClick={()=>setView(v)} style={{padding:'0.375rem 0.75rem',borderRadius:6,border:'1px solid var(--border)',background:view===v?'var(--accent-glow)':'transparent',color:view===v?'var(--accent)':'var(--muted)',cursor:'pointer',fontSize:'0.8rem',fontWeight:500,textTransform:'capitalize'}}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'overview' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',marginBottom:'1rem'}}>
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
          <div className="dp-card" style={{display:'flex',alignItems:'center',gap:'1rem',padding:'1rem'}}>
            <div className="dp-robot" style={{width:48,height:48,fontSize:'1.5rem',flexShrink:0}}>
              <span role="img" aria-label="robot">{String.fromCodePoint(0x1F916)}</span>
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:'0.9rem'}}>DealPilot is ready to help</div>
              <div style={{color:'var(--muted)',fontSize:'0.8rem'}}>Manage your contacts, deals, and documents from this panel or open the full dashboard.</div>
            </div>
          </div>
          <a href="/dashboard" target="_blank" style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',marginTop:'1rem',padding:'0.5rem 1rem',background:'linear-gradient(135deg,var(--gradient-start),var(--gradient-end))',color:'white',borderRadius:8,fontSize:'0.8rem',fontWeight:600,textDecoration:'none'}}>
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
