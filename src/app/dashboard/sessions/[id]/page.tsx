'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, CheckCircle, AlertCircle, Heart, Minus, HelpCircle
} from 'lucide-react'

interface DialogueTurn {
  speaker: 'A' | 'B'
  speakerName: string
  message: string
  turnNumber: number
}

interface DateSummary {
  sharedInterests: string[]
  differences: string[]
  unansweredQuestions: string[]
  compatibilityScore: number
  agentAReasoning: string
  agentBReasoning: string
  overallSummary: string
  redFlags: string[]
  greenFlags: string[]
  recommendation: string
}

interface Session {
  id: string
  status: string
  personA: { id: string; name: string; isSynthetic: boolean }
  personB: { id: string; name: string; isSynthetic: boolean }
  dialogue: string | null
  summary: string | null
  compatibilityScore: number | null
  createdAt: string
  completedAt: string | null
}

const recommendationColors: Record<string, string> = {
  'strong match': 'bg-[#e8f0ed] text-[#4a7a6a] border-[#a8c5b8]',
  'good match': 'bg-[#f5ede0] text-[#8a6040] border-[#dcc9aa]',
  'neutral': 'bg-[#f5f0e8] text-[#4a4035] border-[#e8e0d4]',
  'unlikely match': 'bg-[#fde8e5] text-[#c94535] border-[#f0806f]',
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch(`/api/sessions/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSession(data.session)
      } else if (res.status === 404) {
        router.push('/dashboard/sessions')
      }
      setLoading(false)
    }
    fetchSession()
  }, [id, router])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="card p-6">
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!session) return null

  const dialogue: DialogueTurn[] = session.dialogue ? JSON.parse(session.dialogue) : []
  const summary: DateSummary | null = session.summary ? JSON.parse(session.summary) : null

  const isSynthetic = session.personA.isSynthetic || session.personB.isSynthetic

  return (
    <div className="space-y-6 slide-up max-w-4xl">
      {/* Back */}
      <Link href="/dashboard/sessions" className="btn-ghost text-sm inline-flex">
        <ArrowLeft className="w-4 h-4" />
        Dating Sessions
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl text-display text-[#1a1612]">
                {session.personA.name} & {session.personB.name}
              </h1>
              {isSynthetic && (
                <span className="badge-synthetic">
                  <Sparkles className="w-3 h-3" />
                  Synthetic Demo
                </span>
              )}
            </div>
            <div className="text-xs text-[#8a7d6e]">
              {session.completedAt
                ? `Completed ${new Date(session.completedAt).toLocaleDateString()} at ${new Date(session.completedAt).toLocaleTimeString()}`
                : 'Session in progress'}
            </div>
          </div>

          {session.compatibilityScore !== null && (
            <div className="text-center">
              <div className="text-4xl font-semibold text-[#1a1612]">{session.compatibilityScore}%</div>
              <div className="text-xs text-[#8a7d6e]">Agent compatibility score</div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-4 bg-[#e8e4ff] rounded-xl px-4 py-2.5 text-xs text-[#5040a0]">
          <strong>⚠️ Simulated Dialogue Only:</strong> The conversation below is entirely AI-generated based on documented public profiles.
          It is NOT a real conversation between {session.personA.name} and {session.personB.name}.
          {isSynthetic && ' Both profiles are fictional synthetic data created for demonstration.'}
        </div>
      </div>

      {/* Conversation */}
      {dialogue.length > 0 && (
        <div className="card p-6">
          <h2 className="text-display text-xl text-[#1a1612] mb-5">Simulated Conversation</h2>

          <div className="space-y-4">
            {dialogue.map((turn) => (
              <div
                key={turn.turnNumber}
                className={`flex gap-3 ${turn.speaker === 'B' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${
                    turn.speaker === 'A' ? 'coral-gradient' : 'sage-gradient'
                  }`}
                >
                  {turn.speakerName.charAt(0)}
                </div>
                <div className={`max-w-[75%] ${turn.speaker === 'B' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <span className="text-xs text-[#8a7d6e] px-1">
                    {turn.speakerName} · Turn {turn.turnNumber}
                  </span>
                  <div className={turn.speaker === 'A' ? 'bubble-a' : 'bubble-b'}>
                    <p className="text-sm leading-relaxed">{turn.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="space-y-4">
          {/* Overall recommendation */}
          <div className={`card p-5 border ${recommendationColors[summary.recommendation] || recommendationColors.neutral}`}>
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 flex-shrink-0" />
              <div>
                <div className="font-semibold text-base capitalize">{summary.recommendation}</div>
                <p className="text-sm mt-0.5">{summary.overallSummary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Shared interests */}
            <div className="card p-5">
              <h3 className="text-display text-lg text-[#1a1612] mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#7a9e8e]" />
                Shared Interests
              </h3>
              {summary.sharedInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summary.sharedInterests.map((item, i) => (
                    <span key={i} className="badge-sage">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8a7d6e]">No strong shared interests identified</p>
              )}
            </div>

            {/* Green flags */}
            <div className="card p-5">
              <h3 className="text-display text-lg text-[#1a1612] mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#e85d4a]" />
                Green Flags
              </h3>
              {summary.greenFlags.length > 0 ? (
                <ul className="space-y-1.5">
                  {summary.greenFlags.map((flag, i) => (
                    <li key={i} className="text-xs text-[#4a4035] flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 text-[#7a9e8e] flex-shrink-0 mt-0.5" />
                      {flag}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#8a7d6e]">None identified</p>
              )}
            </div>

            {/* Differences */}
            <div className="card p-5">
              <h3 className="text-display text-lg text-[#1a1612] mb-3 flex items-center gap-2">
                <Minus className="w-4 h-4 text-[#c4a882]" />
                Differences
              </h3>
              {summary.differences.length > 0 ? (
                <ul className="space-y-1.5">
                  {summary.differences.map((diff, i) => (
                    <li key={i} className="text-xs text-[#4a4035] flex items-start gap-1.5">
                      <Minus className="w-3 h-3 text-[#c4a882] flex-shrink-0 mt-0.5" />
                      {diff}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#8a7d6e]">No significant differences identified</p>
              )}
            </div>

            {/* Unanswered questions */}
            <div className="card p-5">
              <h3 className="text-display text-lg text-[#1a1612] mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#8a7d6e]" />
                Open Questions
              </h3>
              {summary.unansweredQuestions.length > 0 ? (
                <ul className="space-y-1.5">
                  {summary.unansweredQuestions.map((q, i) => (
                    <li key={i} className="text-xs text-[#4a4035] flex items-start gap-1.5">
                      <HelpCircle className="w-3 h-3 text-[#8a7d6e] flex-shrink-0 mt-0.5" />
                      {q}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#8a7d6e]">No open questions</p>
              )}
            </div>
          </div>

          {/* Agent reasoning */}
          <div className="card p-5">
            <h3 className="text-display text-lg text-[#1a1612] mb-4">Agent Reasoning</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#faf7f2] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 coral-gradient rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {session.personA.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-[#1a1612]">{session.personA.name}&apos;s Perspective</span>
                </div>
                <p className="text-xs text-[#4a4035] leading-relaxed">{summary.agentAReasoning}</p>
              </div>
              <div className="bg-[#faf7f2] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sage-gradient rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {session.personB.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-[#1a1612]">{session.personB.name}&apos;s Perspective</span>
                </div>
                <p className="text-xs text-[#4a4035] leading-relaxed">{summary.agentBReasoning}</p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#f5f0e8] rounded-xl px-4 py-3 text-xs text-[#8a7d6e] italic">
            This compatibility assessment is based on AI analysis of documented public information only.
            It does not scientifically predict romantic success and should not be interpreted as a definitive judgment.
          </div>
        </div>
      )}
    </div>
  )
}
