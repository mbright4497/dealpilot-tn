'use client'

import type { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-dp-bg-dark">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto bg-dp-bg-dark">
        {children}
      </main>
    </div>
  )
}
