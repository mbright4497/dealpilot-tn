'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: '👥' },
  { href: '/dashboard/deals', label: 'Deals', icon: '🏠' },
  { href: '/dashboard/documents', label: 'Documents', icon: '📄' },
  { href: '/dashboard/checklists', label: 'Checklists', icon: '✅' },
  { href: '/dashboard/offers', label: 'Offer Scores', icon: '🏷' },
  { href: '/dashboard/transaction-steps', label: 'TX Steps', icon: '📋' },
  { href: '/dashboard/contracts', label: 'RF401 Guide', icon: '📑' },
  { href: '/dashboard/chat', label: 'AI Chat', icon: '🤖' },
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
              className={`dp-nav-item${pathname === item.href ? ' active' : ''}`}
            >
              <span className="dp-nav-icon">{item.icon}</span>
              <span className="dp-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="dp-main">
        {children}
      </main>
    </div>
  )
}
