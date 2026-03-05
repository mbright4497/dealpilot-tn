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

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }){
  const pathname = usePathname();
  const supabase = createBrowserClient()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string|null>(null)
  const [open, setOpen] = useState(false)

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.auth.getUser()
      setUserEmail(data?.user?.email || null)
    })()
  },[])

  async function signOut(){
    await supabase.auth.signOut()
    router.push('/login')
  }

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

        <div className="dp-sidebar-footer p-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">{(userEmail||'U')[0].toUpperCase()}</div>
            <div className="flex-1 text-sm text-white">
              <div className="font-semibold truncate">{userEmail || 'User'}</div>
              <button onClick={()=>setOpen(!open)} className="text-xs text-gray-300 mt-1">Account</button>
            </div>
          </div>
          {open && (
            <div className="mt-2 bg-gray-800 border border-gray-700 rounded p-2">
              <div className="text-sm text-gray-300 mb-2">{userEmail}</div>
              <button onClick={signOut} className="w-full py-2 rounded text-white bg-[#F97316] hover:opacity-90">Sign out</button>
            </div>
          )}
        </div>

      </aside>
      <main className="dp-main">
        {children}
      </main>
    </div>
  )
}
