'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useEffect, useState, type ReactNode } from 'react'

const primaryNav = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: '👥' },
  { href: '/dashboard/deals', label: 'Deals', icon: '🏠' },
  { href: '/dashboard/documents', label: 'Documents', icon: '📄' },
  { href: '/dashboard/checklists', label: 'Checklists', icon: '✅' },
  { href: '/dashboard/offers', label: 'Offer Scores', icon: '🏷' },
  { href: '/dashboard/contracts', label: 'RF401 Guide', icon: '📑' },
  { href: '/dashboard/chat', label: 'AI Chat', icon: '🤖' },
]

const secondaryNav = [
  { href: '/deadlines', label: 'Deadlines', icon: '📅' },
  { href: '/communications', label: 'Communications', icon: '💬' },
]

function matches(pathname: string, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === href
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}

function highlightClass(pathname: string, href: string) {
  return matches(pathname, href) ? ' active' : ''
}

const settingsActive = (pathname: string) => pathname === '/settings' || pathname.startsWith('/settings/')

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ''
  const router = useRouter()
  const supabase = createBrowserClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return
        setUserEmail(data?.user?.email || null)
      })
      .catch(() => {
        if (!mounted) return
        setUserEmail(null)
      })
    return () => {
      mounted = false
    }
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      <aside className="dp-sidebar">
        <div className="dp-sidebar-logo">
          <div className="dp-robot" title="ClosingPilot AI">
            <span role="img" aria-label="robot">
              {String.fromCodePoint(0x1f916)}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>ClosingPilot</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>TN Agent Platform</div>
          </div>
        </div>
        <nav className="dp-sidebar-nav">
          {primaryNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`dp-nav-item${highlightClass(pathname, item.href)}`}
            >
              <span className="dp-nav-icon">{item.icon}</span>
              <span className="dp-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <nav className="dp-sidebar-nav mt-3">
          {secondaryNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`dp-nav-item${highlightClass(pathname, item.href)}`}
            >
              <span className="dp-nav-icon">{item.icon}</span>
              <span className="dp-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="dp-sidebar-footer p-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
              {(userEmail || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 text-sm text-white">
              <div className="font-semibold truncate">{userEmail || 'User'}</div>
              <button onClick={() => setAccountOpen(!accountOpen)} className="text-xs text-gray-300 mt-1">
                Account
              </button>
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/settings"
              className={`dp-nav-item justify-start${settingsActive(pathname) ? ' active' : ''}`}
            >
              <span className="dp-nav-icon">⚙️</span>
              <span className="dp-nav-label">Settings</span>
            </Link>
          </div>
          {accountOpen && (
            <div className="mt-3 bg-gray-800 border border-gray-700 rounded p-3 space-y-2">
              <div className="text-sm text-gray-300">{userEmail || 'User'}</div>
              <button onClick={signOut} className="w-full py-2 rounded text-white bg-[#F97316] hover:opacity-90">
                Sign out
              </button>
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
