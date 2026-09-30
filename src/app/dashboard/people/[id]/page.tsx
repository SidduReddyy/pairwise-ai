'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Linkedin, Instagram, Sparkles, Brain, ExternalLink,
  ChevronRight, AlertCircle, CheckCircle, Loader2, RefreshCw, MessageSquareHeart, Trophy
} from 'lucide-react'

interface ProfileData {
  professionalBackground?: {
    currentRole?: string
    industry?: string
    skills?: string[]
    experience?: string
    education?: string
    observations?: string[]
  }
  hobbiesActivities?: {
    confirmed?: string[]
    inferred?: string[]
    sources?: Record<string, string>
  }
  preferences?: {
    stated?: string[]
    apparent?: string[]
  }
  conversationStarters?: Array<{
    topic: string
    starter: string
    rationale: string
    confidence: string
  }>
  evidenceSources?: Array<{
    claim: string
    source: string
    confidence: string
    quote?: string
  }>
  confidenceNotes?: {
    overallConfidence: string
    knownGaps?: string[]
    uncertainties?: string[]
    disclaimer?: string
  }
}

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
    analysisError: string | null
    linkedinRaw: string | null
    instagramRaw: string | null
    professionalBackground: string | null
    hobbiesActivities: string | null
    preferences: string | null
    conversationStarters: string | null
    evidenceSources: string | null
    confidenceNotes: string | null
  } | null
}

const confidenceColors = {
  high: 'text-[#4a7a6a] bg-[#e8f0ed]',
  medium: 'text-[#8a6040] bg-[#f5ede0]',
  low: 'text-[#c94535] bg-[#fde8e5]',
}

export default function PersonProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'raw'>('overview')

  useEffect(() => {
    fetchPerson()
  }, [id])

  async function fetchPerson() {
    setLoading(true)
    try {
      const res = await fetch(`/api/people/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPerson(data.person)
      } else if (res.status === 404) {
        router.push('/dashboard/people')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/analyze/${id}`, { method: 'POST' })
      await fetchPerson()
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="card p-6">
          <div className="skeleton h-16 w-16 rounded-full mb-4" />
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-full mb-1" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (!person) return null

  const profile = person.profile
  const profileData: ProfileData = {}

  if (profile?.professionalBackground) {
    try { profileData.professionalBackground = JSON.parse(profile.professionalBackground) } catch {}
  }
  if (profile?.hobbiesActivities) {
    try { profileData.hobbiesActivities = JSON.parse(profile.hobbiesActivities) } catch {}
  }
  if (profile?.preferences) {
    try { profileData.preferences = JSON.parse(profile.preferences) } catch {}
  }
  if (profile?.conversationStarters) {
    try { profileData.conversationStarters = JSON.parse(profile.conversationStarters) } catch {}
  }
  if (profile?.evidenceSources) {
    try { profileData.evidenceSources = JSON.parse(profile.evidenceSources) } catch {}
  }
  if (profile?.confidenceNotes) {
    try { profileData.confidenceNotes = JSON.parse(profile.confidenceNotes) } catch {}
  }

  const statusColor = {
    done: 'text-[#4a7a6a]',
    running: 'text-[#e8a000]',
    pending: 'text-[#8a7d6e]',
    failed: 'text-[#c94535]',
  }[profile?.analysisStatus || 'pending'] || 'text-[#8a7d6e]'

  return (
    <div className="space-y-6 slide-up">
      {/* Back nav */}
      <Link href="/dashboard/people" className="btn-ghost text-sm inline-flex">
        <ArrowLeft className="w-4 h-4" />
        People
      </Link>

      {/* Profile header card */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl coral-gradient flex items-center justify-center text-white text-3xl font-semibold flex-shrink-0">
            {person.name.charAt(0)}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl text-display text-[#1a1612]">{person.name}</h1>
              {person.isSynthetic && (
                <span className="badge-synthetic">
                  <Sparkles className="w-3 h-3" />
                  Synthetic Demo Profile
                </span>
              )}
            </div>

            {profile?.summary && (
              <p className="text-[#4a4035] text-sm leading-relaxed mb-3">{profile.summary}</p>
            )}

            {/* Source links */}
            <div className="flex flex-wrap gap-2 mb-3">
              {person.linkedinUrl && (
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#0077b5] bg-[#e8f3fb] px-3 py-1.5 rounded-lg hover:bg-[#d0eaf8] transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  LinkedIn
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {person.instagramUrl && (
                <a
                  href={person.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#e1306c] bg-[#fdeaf0] px-3 py-1.5 rounded-lg hover:bg-[#fbd5e0] transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  Instagram
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
            </div>

            {/* Status row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`status-dot status-dot-${profile?.analysisStatus || 'pending'}`} />
                <span className={`font-medium ${statusColor}`}>
                  {profile?.analysisStatus === 'done' ? 'Analysis Complete' :
                   profile?.analysisStatus === 'running' ? 'Analyzing…' :
                   profile?.analysisStatus === 'failed' ? 'Analysis Failed' : 'Not Analyzed'}
                </span>
              </div>

              {profile?.linkedinStatus && (
                <span className="text-xs text-[#8a7d6e]">
                  LinkedIn: <span className="font-medium">{profile.linkedinStatus}</span>
                </span>
              )}
              {profile?.instagramStatus && (
                <span className="text-xs text-[#8a7d6e]">
                  Instagram: <span className="font-medium">{profile.instagramStatus}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || profile?.analysisStatus === 'running'}
              className="btn-primary"
            >
              {analyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : profile?.analysisStatus === 'done' ? (
                <><RefreshCw className="w-4 h-4" /> Re-analyze</>
              ) : (
                <><Brain className="w-4 h-4" /> Analyze Profile</>
              )}
            </button>
            <Link href="/dashboard/sessions" className="btn-secondary text-sm justify-center">
              <MessageSquareHeart className="w-4 h-4" />
              Date Sessions
            </Link>
          </div>
        </div>

        {profile?.analysisError && (
          <div className="mt-4 flex items-start gap-2 bg-[#fde8e5] rounded-xl px-4 py-3 text-sm text-[#c94535]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Analysis Error:</strong> {profile.analysisError}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {profile?.analysisStatus === 'done' && (
        <>
          <div className="flex gap-1 p-1 bg-[#f5f0e8] rounded-xl w-fit">
            {(['overview', 'evidence', 'raw'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-white text-[#1a1612] shadow-sm' : 'text-[#8a7d6e] hover:text-[#4a4035]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Professional Background */}
              {profileData.professionalBackground && (
                <div className="card p-5">
                  <h3 className="text-display text-lg text-[#1a1612] mb-3">Professional Background</h3>
                  {profileData.professionalBackground.currentRole && (
                    <div className="mb-2">
                      <span className="text-xs text-[#8a7d6e] block">Role</span>
                      <span className="text-sm font-medium text-[#2d2820]">{profileData.professionalBackground.currentRole}</span>
                    </div>
                  )}
                  {profileData.professionalBackground.industry && (
                    <div className="mb-2">
                      <span className="text-xs text-[#8a7d6e] block">Industry</span>
                      <span className="text-sm font-medium text-[#2d2820]">{profileData.professionalBackground.industry}</span>
                    </div>
                  )}
                  {profileData.professionalBackground.skills && profileData.professionalBackground.skills.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-[#8a7d6e] block mb-1.5">Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.professionalBackground.skills.map((skill) => (
                          <span key={skill} className="badge-charcoal">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profileData.professionalBackground.observations && profileData.professionalBackground.observations.length > 0 && (
                    <div>
                      <span className="text-xs text-[#8a7d6e] block mb-1.5">Observations</span>
                      <ul className="space-y-1">
                        {profileData.professionalBackground.observations.map((obs, i) => (
                          <li key={i} className="text-xs text-[#4a4035] flex items-start gap-1.5">
                            <ChevronRight className="w-3 h-3 text-[#c4a882] flex-shrink-0 mt-0.5" />
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Hobbies & Activities */}
              {profileData.hobbiesActivities && (
                <div className="card p-5">
                  <h3 className="text-display text-lg text-[#1a1612] mb-3">Hobbies & Activities</h3>
                  {profileData.hobbiesActivities.confirmed && profileData.hobbiesActivities.confirmed.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#7a9e8e]" />
                        <span className="text-xs font-medium text-[#4a7a6a]">Confirmed</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.hobbiesActivities.confirmed.map((hobby) => (
                          <span key={hobby} className="badge-sage">{hobby}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profileData.hobbiesActivities.inferred && profileData.hobbiesActivities.inferred.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#c4a882]" />
                        <span className="text-xs font-medium text-[#8a6040]">Inferred (not confirmed)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.hobbiesActivities.inferred.map((hobby) => (
                          <span key={hobby} className="badge-sand">{hobby}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Conversation Starters */}
              {profileData.conversationStarters && profileData.conversationStarters.length > 0 && (
                <div className="card p-5 col-span-2">
                  <h3 className="text-display text-lg text-[#1a1612] mb-3">Conversation Starters</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {profileData.conversationStarters.slice(0, 4).map((cs, i) => (
                      <div key={i} className="bg-[#faf7f2] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-[#4a4035]">{cs.topic}</span>
                          <span className={`badge text-[10px] px-2 py-0.5 ${confidenceColors[cs.confidence as keyof typeof confidenceColors] || confidenceColors.medium}`}>
                            {cs.confidence} confidence
                          </span>
                        </div>
                        <p className="text-sm text-[#2d2820] italic mb-2">&ldquo;{cs.starter}&rdquo;</p>
                        <p className="text-xs text-[#8a7d6e]">{cs.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferences */}
              {profileData.preferences && (
                <div className="card p-5">
                  <h3 className="text-display text-lg text-[#1a1612] mb-3">Preferences</h3>
                  {profileData.preferences.stated && profileData.preferences.stated.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-[#4a7a6a] block mb-1.5">Explicitly Stated</span>
                      <ul className="space-y-1">
                        {profileData.preferences.stated.map((pref, i) => (
                          <li key={i} className="text-xs text-[#4a4035] flex items-start gap-1.5">
                            <CheckCircle className="w-3 h-3 text-[#7a9e8e] flex-shrink-0 mt-0.5" />
                            {pref}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {profileData.preferences.apparent && profileData.preferences.apparent.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-[#8a6040] block mb-1.5">Apparent from Evidence</span>
                      <ul className="space-y-1">
                        {profileData.preferences.apparent.map((pref, i) => (
                          <li key={i} className="text-xs text-[#4a4035] flex items-start gap-1.5">
                            <ChevronRight className="w-3 h-3 text-[#c4a882] flex-shrink-0 mt-0.5" />
                            {pref}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Confidence notes */}
              {profileData.confidenceNotes && (
                <div className="card p-5">
                  <h3 className="text-display text-lg text-[#1a1612] mb-3">Confidence & Gaps</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-[#8a7d6e]">Overall confidence:</span>
                    <span className={`badge ${confidenceColors[profileData.confidenceNotes.overallConfidence as keyof typeof confidenceColors] || confidenceColors.medium}`}>
                      {profileData.confidenceNotes.overallConfidence}
                    </span>
                  </div>
                  {profileData.confidenceNotes.knownGaps && profileData.confidenceNotes.knownGaps.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-[#8a7d6e] block mb-1">Known Gaps</span>
                      <ul className="space-y-0.5">
                        {profileData.confidenceNotes.knownGaps.map((gap, i) => (
                          <li key={i} className="text-xs text-[#8a7d6e] flex items-start gap-1.5">
                            <AlertCircle className="w-3 h-3 text-[#c4a882] flex-shrink-0 mt-0.5" />
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {profileData.confidenceNotes.disclaimer && (
                    <p className="text-[10px] text-[#8a7d6e] mt-3 italic border-t border-[#e8e0d4] pt-3">
                      {profileData.confidenceNotes.disclaimer}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="card p-6">
              <h3 className="text-display text-xl text-[#1a1612] mb-4">Evidence & Sources</h3>
              {profileData.evidenceSources && profileData.evidenceSources.length > 0 ? (
                <div className="space-y-3">
                  {profileData.evidenceSources.map((evidence, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-[#faf7f2] rounded-xl">
                      <div className="flex-1">
                        <p className="text-sm text-[#2d2820] mb-1">{evidence.claim}</p>
                        {evidence.quote && (
                          <p className="text-xs text-[#8a7d6e] italic mb-2">&ldquo;{evidence.quote}&rdquo;</p>
                        )}
                        <div className="flex gap-2">
                          <span className={`badge text-[10px] ${evidence.source === 'linkedin' ? 'text-[#0077b5] bg-[#e8f3fb]' : evidence.source === 'instagram' ? 'text-[#e1306c] bg-[#fdeaf0]' : 'badge-charcoal'}`}>
                            {evidence.source}
                          </span>
                          <span className={`badge text-[10px] ${confidenceColors[evidence.confidence as keyof typeof confidenceColors] || confidenceColors.medium}`}>
                            {evidence.confidence} confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#8a7d6e]">No evidence sources recorded</p>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="card p-6">
              <h3 className="text-display text-xl text-[#1a1612] mb-4">Raw Retrieved Data</h3>
              <div className="space-y-4">
                {profile?.linkedinRaw && (
                  <div>
                    <h4 className="text-sm font-medium text-[#4a4035] mb-2 flex items-center gap-1.5">
                      <Linkedin className="w-4 h-4 text-[#0077b5]" />
                      LinkedIn Data
                    </h4>
                    <pre className="text-xs text-[#4a4035] bg-[#faf7f2] rounded-xl p-4 overflow-auto max-h-48 text-mono">
                      {JSON.stringify(JSON.parse(profile.linkedinRaw), null, 2)}
                    </pre>
                  </div>
                )}
                {profile?.instagramRaw && (
                  <div>
                    <h4 className="text-sm font-medium text-[#4a4035] mb-2 flex items-center gap-1.5">
                      <Instagram className="w-4 h-4 text-[#e1306c]" />
                      Instagram Data
                    </h4>
                    <pre className="text-xs text-[#4a4035] bg-[#faf7f2] rounded-xl p-4 overflow-auto max-h-48 text-mono">
                      {JSON.stringify(JSON.parse(profile.instagramRaw), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {profile?.analysisStatus === 'pending' && !analyzing && (
        <div className="card p-8 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-[#c4a882]" />
          <h3 className="text-display text-lg text-[#1a1612] mb-2">Profile Not Yet Analyzed</h3>
          <p className="text-[#8a7d6e] text-sm mb-4">
            Click &ldquo;Analyze Profile&rdquo; to retrieve public data and generate an AI profile analysis.
          </p>
          <button onClick={handleAnalyze} className="btn-primary">
            <Brain className="w-4 h-4" />
            Analyze Profile
          </button>
        </div>
      )}

      {(analyzing || profile?.analysisStatus === 'running') && (
        <div className="card p-8 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#e85d4a] animate-spin" />
          <h3 className="text-display text-lg text-[#1a1612] mb-2">Analyzing Profile…</h3>
          <p className="text-[#8a7d6e] text-sm">
            Retrieving public social data and running AI analysis. This may take 30-60 seconds.
          </p>
        </div>
      )}
    </div>
  )
}
