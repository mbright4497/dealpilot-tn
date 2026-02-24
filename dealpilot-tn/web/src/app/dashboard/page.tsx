'use client'
import { useDeals, useContacts } from '../../lib/hooks';

export default function DashboardPage(){
  const { data:deals } = useDeals();
  const { data:contacts } = useContacts();
  const dealCount = deals?.length || 0;
  const contactCount = contacts?.length || 0;
  const activeDeals = deals?.filter((d:any) => d.status === 'active')?.length || 0;

  return (<div>
    <div className="dp-page-header">
      <h1 className="dp-page-title">Dashboard</h1>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'2rem'}}>
      <div className="dp-stat">
        <div style={{fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)',marginBottom:'0.5rem'}}>Total Contacts</div>
        <div className="dp-stat-value">{contactCount}</div>
      </div>
      <div className="dp-stat">
        <div style={{fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)',marginBottom:'0.5rem'}}>Active Deals</div>
        <div className="dp-stat-value">{activeDeals}</div>
      </div>
      <div className="dp-stat">
        <div style={{fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--muted)',marginBottom:'0.5rem'}}>Total Deals</div>
        <div className="dp-stat-value">{dealCount}</div>
      </div>
    </div>

    <div className="dp-card" style={{display:'flex',alignItems:'center',gap:'1.5rem',padding:'2rem'}}>
      <div className="dp-robot" style={{width:64,height:64,fontSize:'2rem',flexShrink:0}}>
        <span role="img" aria-label="robot">\uD83E\uDD16</span>
      </div>
      <div>
        <div style={{fontSize:'1.1rem',fontWeight:600,marginBottom:'0.25rem'}}>Welcome to DealPilot</div>
        <div style={{color:'var(--muted)',fontSize:'0.875rem',lineHeight:1.6}}>
          Your AI-powered deal management platform for Tennessee real estate agents.
          Track contacts, manage deals, score offers, and reference the RF401 Purchase &amp; Sale Agreement - all in one place.
        </div>
      </div>
    </div>
  </div>);
}
