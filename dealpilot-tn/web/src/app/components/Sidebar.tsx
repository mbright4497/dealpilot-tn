'use client'
import Link from 'next/link'
export default function Sidebar(){
  const items = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/transactions', label: 'Transactions' },
    { href: '/deal-playbook', label: 'Deal Playbook' },
    { href: '/deadlines', label: 'Deadlines' },
    { href: '/deal-progress', label: 'Deal Progress' },
    { href: '/ai-assistant', label: 'AI Assistant' },
    { href: '/communications', label: 'Communications' },
    { href: '/settings', label: 'Settings' },
  ]
  return (
    <aside className="w-64 bg-gray-900 text-gray-200 min-h-screen p-4">
      <div className="mb-6 text-xl font-bold">CP</div>
      <nav className="space-y-2 sidebar-nav">
        {items.map(i=> (
          <Link key={i.href} href={i.href} className="block px-3 py-2 rounded hover:bg-gray-800">{i.label}</Link>
        ))}
      </nav>
    </aside>
  )
}
