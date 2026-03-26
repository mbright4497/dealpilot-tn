import { redirect } from 'next/navigation'

export default function Home({ searchParams }: { searchParams?: { start?: string } }) {
  const start = searchParams?.start
  const q = typeof start === 'string' && start ? `?start=${encodeURIComponent(start)}` : ''
  redirect(`/chat${q}`)
}
