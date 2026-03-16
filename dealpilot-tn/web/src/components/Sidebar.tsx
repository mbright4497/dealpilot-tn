'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ClosingPilotLogo from '@/components/ClosingPilotLogo'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/chat' },
  { id: 'transactions', label: 'Transactions', href: '/transactions' },
  { id: 'deadlines', label: 'Deadlines', href: '/deadlines' },
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
    default:
      return null
  }
}

function communicationsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function settingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 15v2m0-6v2m0-6v2M4 7h16M4 11h16M4 15h10" />
    </svg>
  )
}

function matchesRoute(pathname: string, href: string) {
  if (href === '/chat') {
    return pathname === '/chat'
  }
  if (href === '/transactions') {
    return pathname.startsWith('/transactions')
  }
  if (href === '/deadlines') {
    return pathname.startsWith('/deadlines')
  }
  if (href === '/communications') {
    return pathname.startsWith('/communications')
  }
  return false
}

export default function Sidebar() {
  const pathname = usePathname() || ''
  const router = useRouter()
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

  const handleAIClick = () => {
    router.push('/chat?view=ai')
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch (error) {
      console.error(error)
    } finally {
      router.push('/login')
    }
  }

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
            </Link>
          )
        })}
        <button
          type="button"
          onClick={handleAIClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
        >
          <NavIcon name="ai" />
          AI Assistant
        </button>

        <Link
          href="/communications"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            matchesRoute(pathname, '/communications')
              ? 'bg-gray-800 text-orange-400'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {communicationsIcon()}
          Communications
          {unreadCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold">
              {unreadCount}
            </span>
          )}
        </Link>
        <Link
          href="/settings"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/settings' || pathname.startsWith('/settings/')
              ? 'bg-gray-800 text-orange-400'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {settingsIcon()}
          Settings
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">MB</div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium">Matt Bright</p>
          <p className="text-gray-400 text-xs">iHome-KW Kingsport</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-white p-1 rounded"
          title="Logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
