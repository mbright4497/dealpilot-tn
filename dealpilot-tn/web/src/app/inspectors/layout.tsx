import MainLayout from '@/components/MainLayout'
import type { ReactNode } from 'react'

export default function InspectorsLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}
