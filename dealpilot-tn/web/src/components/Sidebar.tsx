'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ClosingPilotLogo from '@/components/ClosingPilotLogo'
import SidebarUserFooter from '@/components/SidebarUserFooter'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'transactions', label: 'Transactions', href: '/transactions' },
  { id: 'deadlines', label: 'Deadlines', href: '/deadlines' },
  { id: 'ai', label: 'AI Assistant', href: '/ai' },
  { id: 'communications', label: 'Communications', href: '/communications' },
  { id: 'settings', label: 'Settings', href: '/settings' },
]

function NavIcon({ name }: { name: string }) {
  const props = { width: 18, height: 18, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 }
  switch (name) {
    case 'dashboard':
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'transactions':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    case 'deadlines':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'ai':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )
    case 'communications':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...props}>
          <path d="M12 15v2m0-6v2m0-6v2M4 7h16M4 11h16M4 15h10" />
        </svg>
      )
    default:
      return null
  }
}

function matchesRoute(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }
  if (href === '/transactions') {
    return pathname.startsWith('/transactions')
  }
  if (href === '/deadlines') {
    return pathname.startsWith('/deadlines')
  }
  if (href === '/ai') {
    return pathname.startsWith('/ai')
  }
  if (href === '/communications') {
    return pathname.startsWith('/communications')
  }
  if (href === '/settings') {
    return pathname === '/settings' || pathname.startsWith('/settings/')
  }
  return false
}

export default function Sidebar() {
  const pathname = usePathname() || ''
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let mounted = true
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (!mounted) return
        const list = Array.isArray(data?.notifications) ? data.notifications : []
        setUnreadCount(list.filter(notification => !notification.read).length)
      })
      .catch(() => {
        if (!mounted) return
        setUnreadCount(0)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <aside className="w-60 bg-dp-sidebar flex flex-col border-r border-gray-800 hidden md:flex">
      <div className="p-4 flex items-center gap-3">
        <ClosingPilotLogo size="sm" />
        <div>
          <h2 className="text-white font-semibold text-sm leading-tight">ClosingPilot TN</h2>
          <p className="text-gray-400 text-xs">Tri-Cities Transaction Coordinator</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const active = matchesRoute(pathname, item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? 'bg-gray-800 text-orange-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <NavIcon name={item.id} />
              {item.label}
              {item.id === 'communications' && unreadCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <SidebarUserFooter />
    </aside>
  )
}
