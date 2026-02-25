'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: 'C' },
  { href: '/dashboard/deals', label: 'Deals', icon: '$' },
  { href: '/dashboard/documents', label: 'Documents', icon: 'F' },
  { href: '/dashboard/checklists', label: 'Checklists', icon: 'L' },
  { href: '/dashboard/offers', label: 'Offer Scores', icon: 'O' },
  { href: '/dashboard/contracts', label: 'RF401 Guide', icon: 'R' },
    { href: '/dashboard/chat', label: 'AI Chat', icon: 'A' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }){
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex" style={{background:'var(--background)'}}>
      <aside className="dp-sidebar">
        <div className="dp-sidebar-logo">
          <div className="dp-robot" title="DealPilot AI">
            <span role="img" aria-label="robot">{String.fromCodePoint(0x1F916)}</span>
          </div>
          <div>
            <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--foreground)'}}>DealPilot</div>
            <div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:2}}>TN Agent Platform</div>
          </div>
        </div>
        <nav className="dp-sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
              style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.625rem 1rem',borderRadius:8,color: pathname === item.href ? 'var(--accent)' : 'var(--muted)',background: pathname === item.href ? 'var(--sidebar-hover)' : 'transparent',textDecoration:'none',fontSize:'0.875rem',transition:'all 0.15s ease'}}
            >
              <span style={{width:20,textAlign:'center',fontSize:'0.85rem',opacity:0.8}}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{flex:1,padding:'2rem',overflowY:'auto'}}>
        {children}
      </main>
    </div>
  );
}
