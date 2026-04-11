import MainLayout from '@/components/MainLayout'
import type { ReactNode } from 'react'

export default function ServiceProvidersLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}
