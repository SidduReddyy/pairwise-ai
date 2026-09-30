'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageSquareHeart, Plus, Loader2, CheckCircle, AlertCircle,
  Clock, Play, RefreshCw, ChevronRight
} from 'lucide-react'

interface Person {
  id: string
  name: string
  isSynthetic: boolean
  avatarUrl: string | null
}

interface Session {
  id: string
  status: string
  personA: Person
  personB: Person
  compatibilityScore: number | null
  completedAt: string | null
  createdAt: string
}

interface PeopleForSelect extends Person {
  profile: { analysisStatus: string } | null
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<PeopleForSelect[]>([])
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchData = useCallback(async () => {
    const [sessionsRes, peopleRes] = await Promise.all([
      fetch('/api/sessions?limit=50'),
      fetch('/api/people?limit=100'),
    ])
    if (sessionsRes.ok) {
      const data = await sessionsRes.json()
      setSessions(data.sessions)
    }
    if (peopleRes.ok) {
      const data = await peopleRes.json()
      setPeople(data.people.filter((p: PeopleForSelect) => p.profile?.analysisStatus === 'done'))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreateSession() {
    if (!selectedA || !selectedB) return
    if (selectedA === selectedB) {
      setCreateError('Cannot create a session between the same person')
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personAId: selectedA, personBId: selectedB }),
      })
      const data = await res.json()

      if (res.ok) {
        setShowForm(false)
        setSelectedA('')
        setSelectedB('')
        await fetchData()
      } else {
        setCreateError(data.error || 'Failed to create session')
      }
    } catch {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-[#4a7a6a] bg-[#e8f0ed]'
    if (score >= 50) return 'text-[#8a6040] bg-[#f5ede0]'
    return 'text-[#c94535] bg-[#fde8e5]'
  }

  const statusIcon = {
    done: <CheckCircle className="w-4 h-4 text-[#7a9e8e]" />,
    running: <Loader2 className="w-4 h-4 text-[#e8a000] animate-spin" />,
    pending: <Clock className="w-4 h-4 text-[#c4a882]" />,
    failed: <AlertCircle className="w-4 h-4 text-[#e85d4a]" />,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl text-display text-[#1a1612] mb-1">Dating Sessions</h1>
          <p className="text-[#8a7d6e] text-sm">
            AI agent simulations of first-date conversations. Each agent represents one person&apos;s documented profile.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {/* AI Disclaimer */}
      <div className="bg-[#e8e4ff] border border-[#c8c0f0] rounded-xl px-4 py-3 text-xs text-[#5040a0]">
        <strong>⚠️ Simulated Dialogue:</strong> All conversations shown here are AI-generated simulations based on public profile data.
        They are NOT real conversations between real people and should not be treated as such.
      </div>

      {/* Create session form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="text-display text-lg text-[#1a1612] mb-4">Create New Dating Session</h3>
          {people.length < 2 ? (
            <div className="text-center py-4 text-[#8a7d6e]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#c4a882]" />
              <p className="text-sm">At least 2 people with completed profile analyses are required.</p>
              <Link href="/dashboard/people" className="btn-primary inline-flex mt-3 text-sm">
                Go to People
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="label">Person A</label>
                <select
                  value={selectedA}
                  onChange={(e) => setSelectedA(e.target.value)}
                  className="input"
                >
                  <option value="">Select a person…</option>
                  {people.filter((p) => p.id !== selectedB).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.isSynthetic ? ' (Synthetic)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex-shrink-0 text-[#c4a882] font-medium mb-2">↔</div>

              <div className="flex-1">
                <label className="label">Person B</label>
                <select
                  value={selectedB}
                  onChange={(e) => setSelectedB(e.target.value)}
                  className="input"
                >
                  <option value="">Select a person…</option>
                  {people.filter((p) => p.id !== selectedA).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.isSynthetic ? ' (Synthetic)' : ''}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreateSession}
                disabled={!selectedA || !selectedB || creating}
                className="btn-primary mb-0"
              >
                {creating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                ) : (
                  <><Play className="w-4 h-4" /> Start Session</>
                )}
              </button>

              <button onClick={() => { setShowForm(false); setCreateError(null) }} className="btn-secondary mb-0">
                Cancel
              </button>
            </div>
          )}

          {createError && (
            <div className="mt-3 flex items-center gap-2 bg-[#fde8e5] text-[#c94535] rounded-xl px-4 py-2.5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {createError}
            </div>
          )}

          {creating && (
            <div className="mt-4 p-4 bg-[#faf7f2] rounded-xl text-sm text-[#8a7d6e]">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Running AI dating session… This involves multiple conversation turns and may take 1-3 minutes.
            </div>
          )}
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 skeleton h-20" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquareHeart className="w-12 h-12 mx-auto mb-4 text-[#c4a882]" />
          <h3 className="text-display text-lg text-[#1a1612] mb-2">No Dating Sessions Yet</h3>
          <p className="text-[#8a7d6e] text-sm mb-4">
            Create your first AI dating session to see simulated conversations between two people.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/dashboard/sessions/${session.id}`}
              className="card-hover p-5 flex items-center gap-4 block"
            >
              <div className="flex-shrink-0">
                {statusIcon[session.status as keyof typeof statusIcon] || statusIcon.pending}
              </div>

              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 coral-gradient rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {session.personA.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1a1612] text-sm">{session.personA.name}</p>
                </div>
                <div className="text-[#c4a882] flex-shrink-0">↔</div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-medium text-[#1a1612] text-sm">{session.personB.name}</p>
                </div>
                <div className="w-9 h-9 sage-gradient rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {session.personB.name.charAt(0)}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {session.compatibilityScore !== null && (
                  <span className={`font-semibold text-sm px-3 py-1.5 rounded-lg ${scoreColor(session.compatibilityScore)}`}>
                    {session.compatibilityScore}%
                  </span>
                )}
                <span className="text-xs text-[#8a7d6e]">
                  {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : 'In progress'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#c4a882]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
