'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, MessageSquareHeart, Trophy, Activity,
  ArrowRight, Plus, Sparkles, TrendingUp, AlertCircle, CheckCircle,
} from 'lucide-react'

interface Stats {
  totalPeople: number
  syntheticPeople: number
  realPeople: number
  totalProfiles: number
  totalSessions: number
  totalRankings: number
  profileStatuses: Record<string, number>
  sessionStatuses: Record<string, number>
  recentLogs: Array<{
    id: string
    stage: string
    status: string
    message: string
    createdAt: string
    person?: { id: string; name: string } | null
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) setStats(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    setSeedResult(null)
    try {
      const res = await fetch('/api/seed', { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setSeedResult(`✓ Seeded ${data.newCount} new synthetic profiles (${data.existingCount} already existed)`)
      fetchStats()
    } catch {
      setSeedResult('✗ Seed failed — check console')
    } finally {
      setSeeding(false)
    }
  }

  const statCards = [
    {
      label: 'Total People',
      value: stats?.totalPeople ?? 0,
      sub: `${stats?.syntheticPeople ?? 0} synthetic · ${stats?.realPeople ?? 0} real`,
      icon: Users,
      color: 'text-[#e85d4a]',
      bg: 'bg-[#fde8e5]',
    },
    {
      label: 'Profiles Analyzed',
      value: stats?.totalProfiles ?? 0,
      sub: `${stats?.profileStatuses?.running ?? 0} running · ${stats?.profileStatuses?.failed ?? 0} failed`,
      icon: Activity,
      color: 'text-[#7a9e8e]',
      bg: 'bg-[#e8f0ed]',
    },
    {
      label: 'Dating Sessions',
      value: stats?.totalSessions ?? 0,
      sub: `${stats?.sessionStatuses?.running ?? 0} in progress`,
      icon: MessageSquareHeart,
      color: 'text-[#c4a882]',
      bg: 'bg-[#f5ede0]',
    },
    {
      label: 'Rankings Generated',
      value: stats?.totalRankings ?? 0,
      sub: 'Compatibility scores computed',
      icon: Trophy,
      color: 'text-[#5040a0]',
      bg: 'bg-[#e8e4ff]',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl text-display text-[#1a1612] mb-2">
            Welcome to Pairwise AI
          </h1>
          <p className="text-[#8a7d6e] text-sm max-w-xl">
            An AI-powered dating compatibility platform. Add people, analyze their public profiles,
            run simulated dating agent conversations, and generate ranked match lists.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn-secondary"
          >
            <Sparkles className="w-4 h-4" />
            {seeding ? 'Seeding…' : 'Seed Demo Data'}
          </button>
          <Link href="/dashboard/people/add" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Person
          </Link>
        </div>
      </div>

      {seedResult && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${seedResult.startsWith('✓') ? 'bg-[#e8f0ed] text-[#4a7a6a]' : 'bg-[#fde8e5] text-[#c94535]'}`}>
          {seedResult.startsWith('✓') ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {seedResult}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              {loading ? (
                <div className="skeleton h-8 w-16 mb-1" />
              ) : (
                <div className="text-3xl font-semibold text-[#1a1612] mb-0.5">
                  {card.value}
                </div>
              )}
              <div className="text-xs text-[#8a7d6e]">{card.sub}</div>
              <div className="text-sm font-medium text-[#4a4035] mt-1">{card.label}</div>
            </div>
          )
        })}
      </div>

      {/* Workflow guide */}
      <div className="card p-6">
        <h2 className="text-display text-xl text-[#1a1612] mb-5">How It Works</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { step: '01', title: 'Add People', desc: 'Enter LinkedIn and Instagram profile URLs. The system validates and retrieves public data.', href: '/dashboard/people/add' },
            { step: '02', title: 'Analyze Profiles', desc: 'Gemini AI generates structured profiles from public data — interests, hobbies, conversation starters.', href: '/dashboard/people' },
            { step: '03', title: 'Run Dating Sessions', desc: 'AI agents simulate conversations between pairs. Each agent only knows its person\'s profile.', href: '/dashboard/sessions' },
            { step: '04', title: 'View Rankings', desc: 'Transparent compatibility scores rank matches. Every score is explained with evidence.', href: '/dashboard/rankings' },
          ].map((item, i) => (
            <Link key={item.step} href={item.href} className="group">
              <div className="card-hover p-5 h-full">
                <div className="text-xs font-medium text-[#8a7d6e] mb-2 text-mono">{item.step}</div>
                <div className="font-semibold text-[#1a1612] mb-2 group-hover:text-[#e85d4a] transition-colors">
                  {item.title}
                </div>
                <p className="text-xs text-[#8a7d6e] leading-relaxed">{item.desc}</p>
                <ArrowRight className="w-3.5 h-3.5 text-[#c4a882] mt-3 group-hover:text-[#e85d4a] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-display text-xl text-[#1a1612]">Recent Activity</h2>
          <Link href="/dashboard/history" className="text-sm text-[#e85d4a] hover:underline">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        ) : stats?.recentLogs && stats.recentLogs.length > 0 ? (
          <div className="space-y-2">
            {stats.recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#faf7f2]"
              >
                <span className={`status-dot mt-1.5 status-dot-${log.status}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2d2820] truncate">{log.message}</p>
                  {log.person && (
                    <p className="text-xs text-[#8a7d6e]">{log.person.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge badge-charcoal">{log.stage}</span>
                  <span className="text-xs text-[#8a7d6e]">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#8a7d6e]">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No activity yet. Add people and start the workflow.</p>
          </div>
        )}
      </div>
    </div>
  )
}
