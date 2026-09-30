'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Users, Search, Filter, Sparkles, AlertCircle, CheckCircle, Clock, Loader2, RefreshCw } from 'lucide-react'

interface Person {
  id: string
  name: string
  linkedinUrl: string | null
  instagramUrl: string | null
  isSynthetic: boolean
  avatarUrl: string | null
  createdAt: string
  profile: {
    analysisStatus: string
    linkedinStatus: string
    instagramStatus: string
    summary: string | null
    analyzedAt: string | null
  } | null
}

const statusConfig: Record<string, { label: string; class: string; dotClass: string }> = {
  done: { label: 'Analyzed', class: 'badge-sage', dotClass: 'status-dot-done' },
  running: { label: 'Analyzing…', class: 'badge-charcoal', dotClass: 'status-dot-running' },
  pending: { label: 'Pending', class: 'badge-sand', dotClass: 'status-dot-pending' },
  failed: { label: 'Failed', class: 'badge-coral', dotClass: 'status-dot-failed' },
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'synthetic' | 'real'>('all')
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})

  const fetchPeople = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filter === 'synthetic') params.set('synthetic', 'true')
      if (filter === 'real') params.set('synthetic', 'false')
      const res = await fetch(`/api/people?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPeople(data.people)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchPeople() }, [fetchPeople])

  async function handleAnalyze(personId: string) {
    setAnalyzing((prev) => ({ ...prev, [personId]: true }))
    try {
      const res = await fetch(`/api/analyze/${personId}`, { method: 'POST' })
      if (res.ok) {
        await fetchPeople()
      }
    } finally {
      setAnalyzing((prev) => ({ ...prev, [personId]: false }))
    }
  }

  async function handleAnalyzeAll() {
    const pending = people.filter(
      (p) => p.profile?.analysisStatus === 'pending' || p.profile?.analysisStatus === 'failed'
    )
    for (const person of pending) {
      await handleAnalyze(person.id)
    }
  }

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = people.filter(
    (p) => p.profile?.analysisStatus === 'pending' || p.profile?.analysisStatus === 'failed'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl text-display text-[#1a1612] mb-1">People & Profiles</h1>
          <p className="text-[#8a7d6e] text-sm">{total} people · {people.filter((p) => p.profile?.analysisStatus === 'done').length} analyzed</p>
        </div>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <button onClick={handleAnalyzeAll} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Analyze All ({pendingCount})
            </button>
          )}
          <Link href="/dashboard/people/add" className="btn-primary">
            Add Person
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7d6e]" />
          <input
            type="text"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'synthetic', 'real'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-[#1a1612] text-white'
                  : 'bg-white text-[#4a4035] border border-[#e8e0d4] hover:bg-[#f5f0e8]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* People grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-10 w-10 rounded-full mb-3" />
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-full mb-1" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-[#c4a882]" />
          <h3 className="text-display text-lg text-[#1a1612] mb-2">No people found</h3>
          <p className="text-[#8a7d6e] text-sm mb-4">
            {search ? `No results for "${search}"` : 'Start by adding people or seeding demo data from the overview.'}
          </p>
          <Link href="/dashboard/people/add" className="btn-primary inline-flex">
            Add Person
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((person) => {
            const status = person.profile?.analysisStatus || 'pending'
            const statusConf = statusConfig[status] || statusConfig.pending
            const isAnalyzing = analyzing[person.id]

            return (
              <div key={person.id} className="card-hover p-5 group">
                <div className="flex items-start justify-between mb-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full coral-gradient flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {person.name.charAt(0)}
                  </div>
                  <div className="flex gap-1.5">
                    {person.isSynthetic && (
                      <span className="badge-synthetic">
                        <Sparkles className="w-3 h-3" />
                        Synthetic
                      </span>
                    )}
                    <span className={statusConf.class + ' badge'}>
                      <span className={statusConf.dotClass} />
                      {statusConf.label}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-[#1a1612] mb-0.5">{person.name}</h3>

                {person.profile?.summary ? (
                  <p className="text-xs text-[#8a7d6e] line-clamp-2 mb-3 leading-relaxed">
                    {person.profile.summary}
                  </p>
                ) : (
                  <p className="text-xs text-[#8a7d6e] mb-3 italic">Profile not yet analyzed</p>
                )}

                {/* Source indicators */}
                <div className="flex gap-2 mb-3">
                  <span className={`badge text-[10px] ${person.linkedinUrl ? 'badge-charcoal' : 'opacity-40 badge-charcoal'}`}>
                    LinkedIn {person.linkedinUrl ? '✓' : '—'}
                  </span>
                  <span className={`badge text-[10px] ${person.instagramUrl ? 'badge-charcoal' : 'opacity-40 badge-charcoal'}`}>
                    Instagram {person.instagramUrl ? '✓' : '—'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/people/${person.id}`}
                    className="btn-ghost text-xs px-3 py-1.5 flex-1 justify-center"
                  >
                    View Profile
                  </Link>
                  {(status === 'pending' || status === 'failed') && (
                    <button
                      onClick={() => handleAnalyze(person.id)}
                      disabled={isAnalyzing}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Analyze'
                      )}
                    </button>
                  )}
                  {status === 'done' && (
                    <button
                      onClick={() => handleAnalyze(person.id)}
                      disabled={isAnalyzing}
                      className="btn-ghost text-xs px-3 py-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
