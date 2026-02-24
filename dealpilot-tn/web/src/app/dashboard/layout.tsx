'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '\u2302' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: '\u263A' },
  { href: '/dashboard/deals', label: 'Deals', icon: '\u2606' },
  { href: '/dashboard/documents', label: 'Documents', icon: '\u2691' },
  { href: '/dashboard/checklists', label: 'Checklists', icon: '\u2611' },
  { href: '/dashboard/offers', label: 'Offer Scores', icon: '\u2691' },
  { href: '/dashboard/contracts', label: 'RF401 Guide', icon: '\u2693' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }){
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex" style={{background:'var(--background)'}}>
      <aside className="dp-sidebar">
        <div className="dp-sidebar-logo">
          <div className="dp-robot" title="DealPilot AI">
            <span role="img" aria-label="robot">\uD83E\uDD16</span>
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
            >
              <span style={{fontSize:'1.1rem',width:20,textAlign:'center'}}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{marginTop:'auto',padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',color:'white',fontWeight:600}}>MB</div>
            <div>
              <div style={{fontSize:'0.8rem',fontWeight:500,color:'var(--foreground)'}}>Agent</div>
              <div style={{fontSize:'0.7rem',color:'var(--muted)'}}>iHome Team</div>
            </div>
          </div>
        </div>
      </aside>
      <main style={{flex:1,padding:'2rem',overflowY:'auto',minHeight:'100vh'}}>{children}</main>
    </div>
  );
}
