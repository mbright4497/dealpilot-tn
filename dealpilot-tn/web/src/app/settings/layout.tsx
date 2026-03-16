import MainLayout from '@/components/MainLayout'
import type { ReactNode } from 'react'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}
