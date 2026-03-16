import MainLayout from '@/components/MainLayout'
import type { ReactNode } from 'react'

export default function DeadlinesLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}
