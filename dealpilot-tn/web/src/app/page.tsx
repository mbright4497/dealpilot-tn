import Link from 'next/link';
import React from 'react';

function HeroRobot() {
  return (
    <svg width="120" height="120" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 0 20px rgba(79,140,255,0.6))'}}>
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f8cff"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
      </defs>
      <line x1="40" y1="8" x2="40" y2="18" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="40" cy="6" r="3" fill="#4f8cff">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/>
      </circle>
      <rect x="20" y="18" width="40" height="28" rx="8" fill="url(#heroGrad)"/>
      <circle cx="31" cy="30" r="4" fill="#0a0e1a">
        <animate attributeName="r" values="4;3.5;4" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="49" cy="30" r="4" fill="#0a0e1a">
        <animate attributeName="r" values="4;3.5;4" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="32" cy="29" r="1.5" fill="#4f8cff"/>
      <circle cx="50" cy="29" r="1.5" fill="#4f8cff"/>
      <path d="M32 41 Q40 46 48 41" stroke="#0a0e1a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <rect x="36" y="46" width="8" height="6" rx="2" fill="#3a4a7a"/>
      <rect x="16" y="52" width="48" height="22" rx="8" fill="url(#heroGrad)" opacity="0.9"/>
      <rect x="26" y="57" width="28" height="12" rx="4" fill="rgba(10,14,26,0.5)"/>
      <circle cx="34" cy="63" r="3" fill="#22c55e">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <rect x="40" y="60" width="10" height="2" rx="1" fill="#4f8cff" opacity="0.8"/>
      <rect x="40" y="64" width="7" height="2" rx="1" fill="#a855f7" opacity="0.8"/>
      <rect x="4" y="54" width="12" height="6" rx="3" fill="url(#heroGrad)" opacity="0.8"/>
      <rect x="64" y="54" width="12" height="6" rx="3" fill="url(#heroGrad)" opacity="0.8"/>
    </svg>
  );
}

export default function LandingPage() {
  const features = [
    {icon:'\u{1F4CB}',title:'Deal Pipeline',desc:'Track every deal from lead to close with visual status tracking.'},
    {icon:'\u{1F4C4}',title:'RF401 Guide',desc:'Interactive Tennessee purchase agreement walkthrough for agents.'},
    {icon:'\u{1F465}',title:'Contact Manager',desc:'Centralized contact management with quick add and search.'},
    {icon:'\u{1F4CA}',title:'Offer Scoring',desc:'AI-powered offer comparison to pick the strongest deals.'},
    {icon:'\u{2705}',title:'Checklists',desc:'Never miss a step with deal-specific task checklists.'},
    {icon:'\u{1F517}',title:'GHL Integration',desc:'Embed DealPilot inside GoHighLevel as an agent tool.'},
  ];
  return (
    <div style={{minHeight:'100vh',background:'var(--background)',color:'var(--foreground)'}}>
      {/* Nav */}
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1.25rem 2rem',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <div className="dp-robot" style={{width:36,height:36,fontSize:'1.1rem'}}>
            <span role="img" aria-label="robot">{String.fromCodePoint(0x1F916)}</span>
          </div>
          <span style={{fontSize:'1.1rem',fontWeight:700}}>DealPilot TN</span>
        </div>
        <Link href="/login" style={{padding:'0.5rem 1.25rem',background:'linear-gradient(135deg,var(--gradient-start),var(--gradient-end))',color:'white',borderRadius:8,fontSize:'0.875rem',fontWeight:600,textDecoration:'none'}}>Sign In</Link>
      </nav>

      {/* Hero */}
      <div style={{textAlign:'center',padding:'5rem 2rem 3rem',maxWidth:800,margin:'0 auto',background:'radial-gradient(ellipse at 50% 0%, rgba(79,140,255,0.06) 0%, transparent 60%)'}}>
        <div style={{marginBottom:'1.5rem'}}>
          <HeroRobot />
        </div>
        <div style={{display:'inline-block',padding:'0.375rem 1rem',borderRadius:20,border:'1px solid var(--border)',fontSize:'0.8rem',color:'var(--accent)',marginBottom:'1.5rem',fontWeight:500}}>Built for TN Real Estate Agents</div>
        <h1 style={{fontSize:'3rem',fontWeight:800,lineHeight:1.1,marginBottom:'1.25rem',letterSpacing:'-0.03em'}}>
          Your AI-Powered<br/>
          <span style={{background:'linear-gradient(135deg,var(--gradient-start),var(--gradient-end))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Deal Command Center</span>
        </h1>
        <p style={{fontSize:'1.1rem',color:'var(--muted)',maxWidth:560,margin:'0 auto 2rem',lineHeight:1.6}}>Manage contacts, track deals, score offers, and navigate RF401 contracts. Works standalone or embedded inside GoHighLevel.</p>
        <div style={{display:'flex',gap:'1rem',justifyContent:'center'}}>
          <Link href="/login" style={{padding:'0.75rem 2rem',background:'linear-gradient(135deg,var(--gradient-start),var(--gradient-end))',color:'white',borderRadius:10,fontWeight:600,textDecoration:'none',boxShadow:'0 4px 20px rgba(79,140,255,0.3)'}}>Get Started</Link>
          <Link href="#features" style={{padding:'0.75rem 2rem',border:'1px solid var(--border)',color:'var(--foreground)',borderRadius:10,fontWeight:600,textDecoration:'none'}}>See Features</Link>
        </div>
      </div>

      {/* Features */}
      <div id="features" style={{padding:'4rem 2rem',maxWidth:1000,margin:'0 auto'}}>
        <h2 style={{textAlign:'center',fontSize:'2rem',fontWeight:700,marginBottom:'3rem'}}>Everything Agents Need</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1.5rem'}}>
          {features.map((f,i) => (
            <div key={i} className="dp-card" style={{padding:'1.5rem'}}>
              <div style={{fontSize:'1.5rem',marginBottom:'0.75rem'}}>{f.icon}</div>
              <div style={{fontWeight:600,marginBottom:'0.375rem'}}>{f.title}</div>
              <div style={{color:'var(--muted)',fontSize:'0.875rem',lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{textAlign:'center',padding:'4rem 2rem',background:'linear-gradient(135deg,rgba(79,140,255,0.06),rgba(168,85,247,0.06))',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
        <h2 style={{fontSize:'1.75rem',fontWeight:700,marginBottom:'1rem'}}>Ready to Close More Deals?</h2>
        <p style={{color:'var(--muted)',marginBottom:'1.5rem',fontSize:'1rem'}}>Join Keller Williams agents using DealPilot in the Tri-Cities.</p>
        <Link href="/login" style={{padding:'0.75rem 2.5rem',background:'linear-gradient(135deg,var(--gradient-start),var(--gradient-end))',color:'white',borderRadius:10,fontWeight:600,textDecoration:'none',boxShadow:'0 4px 20px rgba(79,140,255,0.3)',fontSize:'1rem'}}>Start Free</Link>
      </div>

      {/* Footer */}
      <div style={{borderTop:'1px solid var(--border)',padding:'2rem',textAlign:'center',color:'var(--muted)',fontSize:'0.8rem'}}>
        DealPilot TN &mdash; iHome Team, Keller Williams Kingsport
      </div>
    </div>
  );
}
