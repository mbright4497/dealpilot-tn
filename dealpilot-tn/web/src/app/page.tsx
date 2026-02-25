import Link from 'next/link';
import React from 'react';

export default function LandingPage() {
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
          {[
            {icon:String.fromCodePoint(0x1F4CB),title:'Deal Pipeline',desc:'Track every deal from lead to close with visual status tracking.'},
            {icon:String.fromCodePoint(0x1F4C4),title:'RF401 Guide',desc:'Interactive Tennessee purchase agreement walkthrough for agents.'},
            {icon:String.fromCodePoint(0x1F465),title:'Contact Manager',desc:'Centralized contact management with quick add and search.'},
            {icon:String.fromCodePoint(0x1F4CA),title:'Offer Scoring',desc:'AI-powered offer comparison to pick the strongest deals.'},
            {icon:String.fromCodePoint(0x2705),title:'Checklists',desc:'Never miss a step with deal-specific task checklists.'},
            {icon:String.fromCodePoint(0x1F517),title:'GHL Integration',desc:'Embed DealPilot inside GoHighLevel as an agent tool.'},
          ].map((f,i) => (
            <div key={i} className="dp-card" style={{padding:'1.5rem'}}>
              <div style={{fontSize:'1.5rem',marginBottom:'0.75rem'}}>{f.icon}</div>
              <div style={{fontWeight:600,marginBottom:'0.375rem'}}>{f.title}</div>
              <div style={{color:'var(--muted)',fontSize:'0.875rem',lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{borderTop:'1px solid var(--border)',padding:'2rem',textAlign:'center',color:'var(--muted)',fontSize:'0.8rem'}}>
        DealPilot TN &mdash; iHome Team, Keller Williams Kingsport
      </div>
    </div>
  );
}
