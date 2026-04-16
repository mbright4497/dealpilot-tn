'use client'

import Link from 'next/link'
import { Mail, Phone, Star, Tag } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ServiceProvider {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  category: string
  preferred: boolean
  booking_method: string | null
  booking_url: string | null
  specialties: string[] | null
  notes: string | null
  active: boolean
}

const categories = [
  { value: 'all', label: 'All Providers' },
  { value: 'inspector', label: 'Inspectors' },
  { value: 'title_company', label: 'Title Companies' },
  { value: 'lender', label: 'Lenders' },
  { value: 'appraiser', label: 'Appraisers' },
  { value: 'surveyor', label: 'Surveyors' },
  { value: 'attorney', label: 'Attorneys' },
]

function categoryTitle(key: string): string {
  const found = categories.find((c) => c.value === key)
  if (found && found.value !== 'all') return found.label
  return key.replace(/_/g, ' ')
}

export default function ServiceProvidersPage() {
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [error, setError] = useState<string | null>(null)

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory)
      }

      const response = await fetch(`/api/service-providers?${params}`, { cache: 'no-store' })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const data = await response.json()
      setProviders(data.providers || [])
    } catch (err) {
      console.error('Fetch providers error')
      setError(err instanceof Error ? err.message : 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    void fetchProviders()
  }, [fetchProviders])

  const groupedProviders = providers.reduce(
    (acc, provider) => {
      const cat = provider.category || 'other'
      if (!acc[cat]) {
        acc[cat] = []
      }
      acc[cat].push(provider)
      return acc
    },
    {} as Record<string, ServiceProvider[]>
  )

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-white">Service Providers</h1>
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-400">Loading providers…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-white">Service Providers</h1>
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <div className="text-red-200">Error: {error}</div>
          <button
            type="button"
            onClick={() => void fetchProviders()}
            className="mt-2 text-red-300 hover:text-red-100"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Service Providers</h1>
        <Link
          href="/inspectors"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Add provider
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setSelectedCategory(category.value)}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedCategory === category.value
                  ? 'bg-orange-500 text-white'
                  : 'border border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-500'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {providers.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4 text-slate-400">No service providers found</div>
          <Link
            href="/inspectors"
            className="inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Add your first provider
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedProviders).map(([categoryKey, categoryProviders]) => (
            <div key={categoryKey} className="space-y-4">
              <h3 className="text-lg font-medium capitalize text-slate-100">
                {categoryTitle(categoryKey)} ({categoryProviders.length})
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="font-medium text-white">{provider.name}</h4>
                      {provider.preferred ? (
                        <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                      ) : null}
                    </div>

                    {provider.company ? (
                      <p className="mb-2 text-sm text-slate-400">{provider.company}</p>
                    ) : null}

                    <div className="space-y-1 text-sm text-slate-300">
                      {provider.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                          <span>{provider.phone}</span>
                        </div>
                      ) : null}
                      {provider.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                          <span className="truncate">{provider.email}</span>
                        </div>
                      ) : null}
                      {provider.specialties && provider.specialties.length > 0 ? (
                        <div className="flex items-start gap-2">
                          <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                          <span>{provider.specialties.join(', ')}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        Edit, delete, or add details in the{' '}
        <Link href="/inspectors" className="text-orange-400 hover:underline">
          provider directory
        </Link>
        .
      </p>
    </div>
  )
}
