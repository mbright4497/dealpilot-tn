'use client'
import Link from 'next/link';
export default function DashboardLayout({ children }: { children: React.ReactNode }){
  return (<div className="min-h-screen flex">
    <aside className="w-64 bg-gray-800 text-white p-4"> 
      <h2 className="font-bold text-lg">DealPilot</h2>
      <nav className="mt-4">
        <ul>
          <li><Link href="/dashboard">Summary</Link></li>
          <li><Link href="/dashboard/contacts">Contacts</Link></li>
          <li><Link href="/dashboard/deals">Deals</Link></li>
          <li><Link href="/dashboard/documents">Documents</Link></li>
          <li><Link href="/dashboard/checklists">Checklists</Link></li>
          <li><Link href="/dashboard/offers">Offers</Link></li>
        </ul>
      </nav>
    </aside>
    <main className="flex-1 p-6">{children}</main>
  </div>);
}
