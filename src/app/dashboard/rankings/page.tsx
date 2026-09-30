'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Trophy, RefreshCw, Loader2, AlertCircle, ChevronRight, Sparkles } from 'lucide-react'

interface RankedPerson {
  id: string
  name: string
  avatarUrl: string | null
  isSynthetic: boolean
  profile: {
    summary: string | null
    hobbiesActivities: string | null
    analysisStatus: string
  } | null
}

interface Ranking {
  id: string
  rank: number
  totalScore: number
  sharedInterestsScore: number
  preferenceScore: number
  lifestyleScore: number
  dateOutcomeScore: number
  uncertaintyPenalty: number
  explanation: string | null
  forPerson: { id: string; name: string; isSynthetic: boolean }
  rankedPerson: RankedPerson
  session: { id: string; status: string; compatibilityScore: number | null } | null
}

interface GroupedRankings {
  [personId: string]: {
    forPerson: Ranking['forPerson']
    rankings: Ranking[]
  }
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState<GroupedRankings>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)

  const fetchRankings = useCallback(async () => {
    const res = await fetch('/api/rankings')
    if (res.ok) {
      const data = await res.json()
      const grouped: GroupedRankings = {}
      for (const r of data.rankings as Ranking[]) {
        if (!grouped[r.forPerson.id]) {
          grouped[r.forPerson.id] = { forPerson: r.forPerson, rankings: [] }
        }
        grouped[r.forPerson.id].rankings.push(r)
      }
      setRankings(grouped)
      if (!expandedPerson && Object.keys(grouped).length > 0) {
        setExpandedPerson(Object.keys(grouped)[0])
      }
    }
    setLoading(false)
  }, [expandedPerson])

  useEffect(() => { fetchRankings() }, [fetchRankings])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/rankings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (res.ok) await fetchRankings()
    } finally {
      setGenerating(false)
    }
  }

  const scoreBar = (score: number, color: string) => (
    <div className="progress-bar flex-1">
      <div
        className={`progress-fill ${color}`}
        style={{ width: `${Math.max(2, score)}%` }}
      />
    </div>
  )

  const rankMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#4a7a6a]'
    if (score >= 50) return 'text-[#8a6040]'
    return 'text-[#c94535]'
  }

  const personIds = Object.keys(rankings)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl text-display text-[#1a1612] mb-1">Match Rankings</h1>
          <p className="text-[#8a7d6e] text-sm">
            Personalized ranked compatibility lists for each person. Scores are transparent, evidence-based, and explained.
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Generate Rankings</>
          )}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#f5ede0] border border-[#dcc9aa] rounded-xl px-4 py-3 text-xs text-[#8a6040]">
        <strong>Disclaimer:</strong> These compatibility scores are algorithmic similarity indicators based on documented public information only.
        They do <em>not</em> scientifically predict romantic success or compatibility. Uncertainty penalties are applied when data is limited.
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 skeleton h-24" />)}
        </div>
      ) : personIds.length === 0 ? (
        <div className="card p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-[#c4a882]" />
          <h3 className="text-display text-lg text-[#1a1612] mb-2">No Rankings Yet</h3>
          <p className="text-[#8a7d6e] text-sm mb-4">
            At least 2 people with completed profiles are needed. Then click &ldquo;Generate Rankings&rdquo;.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/people" className="btn-secondary">View People</Link>
            <button onClick={handleGenerate} className="btn-primary">Generate Rankings</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Person selector sidebar */}
          <div className="w-64 flex-shrink-0 space-y-1">
            <p className="text-xs font-medium text-[#8a7d6e] px-2 mb-2">VIEW RANKINGS FOR</p>
            {personIds.map((personId) => {
              const group = rankings[personId]
              const topScore = group.rankings[0]?.totalScore || 0
              return (
                <button
                  key={personId}
                  onClick={() => setExpandedPerson(personId)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    expandedPerson === personId
                      ? 'bg-[#fde8e5] text-[#c94535]'
                      : 'hover:bg-[#f5f0e8] text-[#4a4035]'
                  }`}
                >
                  <div className="w-8 h-8 coral-gradient rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {group.forPerson.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{group.forPerson.name}</p>
                    <p className="text-xs text-[#8a7d6e]">{group.rankings.length} matches</p>
                  </div>
                  {group.forPerson.isSynthetic && (
                    <Sparkles className="w-3 h-3 flex-shrink-0 opacity-60" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Rankings panel */}
          <div className="flex-1 min-w-0">
            {expandedPerson && rankings[expandedPerson] && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-display text-xl text-[#1a1612]">
                    Best matches for {rankings[expandedPerson].forPerson.name}
                  </h2>
                  <span className="badge-charcoal">{rankings[expandedPerson].rankings.length} people ranked</span>
                </div>

                {rankings[expandedPerson].rankings.map((ranking) => {
                  const explanation = ranking.explanation ? JSON.parse(ranking.explanation) : null
                  const hobbies = ranking.rankedPerson.profile?.hobbiesActivities
                    ? JSON.parse(ranking.rankedPerson.profile.hobbiesActivities)
                    : null

                  return (
                    <div key={ranking.id} className="card p-5">
                      <div className="flex items-start gap-4">
                        {/* Rank medal */}
                        <div className="w-10 text-center flex-shrink-0">
                          <span className="text-xl">{rankMedal(ranking.rank)}</span>
                        </div>

                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full sage-gradient flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {ranking.rankedPerson.name.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[#1a1612]">{ranking.rankedPerson.name}</h3>
                            {ranking.rankedPerson.isSynthetic && (
                              <span className="badge-synthetic text-[10px]">
                                <Sparkles className="w-2.5 h-2.5" />
                                Synthetic
                              </span>
                            )}
                          </div>

                          {ranking.rankedPerson.profile?.summary && (
                            <p className="text-xs text-[#8a7d6e] mb-2 line-clamp-1">
                              {ranking.rankedPerson.profile.summary}
                            </p>
                          )}

                          {/* Score bars */}
                          <div className="space-y-1.5">
                            {[
                              { label: 'Shared Interests', score: ranking.sharedInterestsScore, color: 'score-excellent' },
                              { label: 'Preferences', score: ranking.preferenceScore, color: 'score-good' },
                              { label: 'Lifestyle', score: ranking.lifestyleScore, color: 'score-moderate' },
                              { label: 'Date Outcome', score: ranking.dateOutcomeScore, color: 'score-excellent' },
                            ].map(({ label, score, color }) => (
                              <div key={label} className="flex items-center gap-2">
                                <span className="text-[10px] text-[#8a7d6e] w-24 flex-shrink-0">{label}</span>
                                {scoreBar(score, color)}
                                <span className="text-[10px] font-medium text-[#4a4035] w-8 text-right">{score}</span>
                              </div>
                            ))}
                            {ranking.uncertaintyPenalty > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#c94535] w-24 flex-shrink-0">Uncertainty —</span>
                                <div className="flex-1 text-[10px] text-[#c94535]">
                                  -{ranking.uncertaintyPenalty} pts penalty for limited data
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Shared interests tags */}
                          {explanation?.sharedInterests && explanation.sharedInterests.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {explanation.sharedInterests.slice(0, 4).map((interest: string, i: number) => (
                                <span key={i} className="badge-sage text-[10px]">{interest}</span>
                              ))}
                            </div>
                          )}

                          {explanation?.disclaimer && (
                            <p className="text-[10px] text-[#8a7d6e] mt-2 italic">{explanation.disclaimer}</p>
                          )}
                        </div>

                        {/* Total score */}
                        <div className="flex-shrink-0 text-right">
                          <div className={`text-2xl font-semibold ${getScoreColor(ranking.totalScore)}`}>
                            {ranking.totalScore}
                          </div>
                          <div className="text-xs text-[#8a7d6e]">/ 100</div>
                          {ranking.session && (
                            <Link
                              href={`/dashboard/sessions/${ranking.session.id}`}
                              className="text-[10px] text-[#e85d4a] hover:underline mt-1 block"
                            >
                              View session →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
