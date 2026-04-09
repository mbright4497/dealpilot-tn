'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AcademyPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/transactions') }, [router])
  return null
}
