'use client'
import React, { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase';

export default function DashboardPage(){
  const [stats, setStats] = useState({ contacts: 0, deals: 0, active: 0 });
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <div className="dp-page-header">
        <h1 className="dp-page-title">Dashboard</h1>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'2rem'}}>
        <div className="dp-stat">
          <div style={{fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)',marginBottom:'0.5rem'}}>Total Contacts</div>
          <div className="dp-stat-value">{loading ? '...' : stats.contacts}</div>
        </div>
        <div className="dp-stat">
          <div style={{fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)',marginBottom:'0.5rem'}}>Active Deals</div>
          <div className="dp-stat-value">{loading ? '...' : stats.active}</div>
        </div>
        <div className="dp-stat">
          <div style={{fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)',marginBottom:'0.5rem'}}>Total Deals</div>
          <div className="dp-stat-value">{loading ? '...' : stats.deals}</div>
        </div>
      </div>

      <div className="dp-card" style={{display:'flex',alignItems:'center',gap:'1.5rem',padding:'2rem'}}>
        <div className="dp-robot" style={{width:64,height:64,fontSize:'2rem',flexShrink:0}}>
          <span role="img" aria-label="robot">{String.fromCodePoint(0x1F916)}</span>
        </div>
        <div>
          <div style={{fontSize:'1.1rem',fontWeight:600,color:'var(--foreground)',marginBottom:'0.25rem'}}>Welcome to DealPilot TN</div>
          <div style={{color:'var(--muted)',fontSize:'0.9rem'}}>Your AI-powered real estate agent platform. Manage contacts, deals, documents, and more from one dashboard.</div>
        </div>
      </div>
    </div>
  );
}
