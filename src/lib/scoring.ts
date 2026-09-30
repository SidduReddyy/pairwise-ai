/**
 * Compatibility Scoring Engine
 * Generates personalized ranked match lists with transparent, configurable scores.
 * 
 * DISCLAIMER: These scores are algorithmic similarity indicators based on
 * documented public information. They do NOT scientifically predict romantic success.
 */

import type { ProfileAnalysis } from '../ai/profile-analyzer'
import type { DateSummary } from '../ai/dating-agent'

export interface ScoringWeights {
  sharedInterests: number      // default 0.30
  preferenceAlignment: number  // default 0.25
  lifestyleCompatibility: number // default 0.20
  dateOutcome: number          // default 0.25
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  sharedInterests: 0.30,
  preferenceAlignment: 0.25,
  lifestyleCompatibility: 0.20,
  dateOutcome: 0.25,
}

export interface ScoreBreakdown {
  totalScore: number
  sharedInterestsScore: number
  preferenceScore: number
  lifestyleScore: number
  dateOutcomeScore: number
  uncertaintyPenalty: number
  explanation: ScoreExplanation
}

export interface ScoreExplanation {
  sharedInterests: string[]
  preferenceMatches: string[]
  lifestyleNotes: string[]
  dateOutcomeNotes: string
  uncertainties: string[]
  disclaimer: string
}

/**
 * Calculate Jaccard similarity between two string arrays (case-insensitive)
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a.map((s) => s.toLowerCase().trim()))
  const setB = new Set(b.map((s) => s.toLowerCase().trim()))
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

/**
 * Find common elements between two arrays (fuzzy match)
 */
function findCommon(a: string[], b: string[]): string[] {
  const common: string[] = []
  for (const itemA of a) {
    for (const itemB of b) {
      if (
        itemA.toLowerCase().includes(itemB.toLowerCase().split(' ')[0]) ||
        itemB.toLowerCase().includes(itemA.toLowerCase().split(' ')[0])
      ) {
        common.push(itemA)
        break
      }
    }
  }
  return [...new Set(common)]
}

/**
 * Score shared interests between two profiles
 */
function scoreSharedInterests(
  profileA: ProfileAnalysis,
  profileB: ProfileAnalysis,
): { score: number; sharedItems: string[] } {
  const interestsA = [
    ...profileA.hobbiesActivities.confirmed,
    ...profileA.hobbiesActivities.inferred.map((i) => `~${i}`),
  ]
  const interestsB = [
    ...profileB.hobbiesActivities.confirmed,
    ...profileB.hobbiesActivities.inferred.map((i) => `~${i}`),
  ]

  const confirmedCommon = findCommon(
    profileA.hobbiesActivities.confirmed,
    profileB.hobbiesActivities.confirmed,
  )

  const allCommon = findCommon(interestsA, interestsB)
  const similarity = jaccardSimilarity(interestsA, interestsB)

  // Score: confirmed common items weighted more
  const score = Math.min(100, confirmedCommon.length * 20 + (allCommon.length - confirmedCommon.length) * 10 + similarity * 40)

  return { score, sharedItems: allCommon.slice(0, 5) }
}

/**
 * Score preference alignment
 */
function scorePreferenceAlignment(
  profileA: ProfileAnalysis,
  profileB: ProfileAnalysis,
): { score: number; matches: string[] } {
  const prefsA = [...profileA.preferences.stated, ...profileA.preferences.apparent]
  const prefsB = [...profileB.preferences.stated, ...profileB.preferences.apparent]

  if (prefsA.length === 0 && prefsB.length === 0) {
    return { score: 0, matches: [] }
  }

  const matches = findCommon(prefsA, prefsB)
  const score = Math.min(100, matches.length * 25 + jaccardSimilarity(prefsA, prefsB) * 50)

  return { score, matches }
}

/**
 * Score lifestyle compatibility based on professional background
 */
function scoreLifestyleCompatibility(
  profileA: ProfileAnalysis,
  profileB: ProfileAnalysis,
): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 50 // baseline

  // Industry similarity
  if (profileA.professionalBackground.industry && profileB.professionalBackground.industry) {
    if (
      profileA.professionalBackground.industry.toLowerCase() ===
      profileB.professionalBackground.industry.toLowerCase()
    ) {
      score += 20
      notes.push(`Both work in ${profileA.professionalBackground.industry}`)
    }
  }

  // Skill overlap
  const skillsA = profileA.professionalBackground.skills || []
  const skillsB = profileB.professionalBackground.skills || []
  const skillSimilarity = jaccardSimilarity(skillsA, skillsB)
  if (skillSimilarity > 0.3) {
    score += 15
    notes.push('Overlapping professional skills and interests')
  }

  if (notes.length === 0) {
    notes.push('Insufficient data for detailed lifestyle comparison')
  }

  return { score: Math.min(100, score), notes }
}

/**
 * Score based on date simulation outcome
 */
function scoreDateOutcome(dateSummary: DateSummary | null): { score: number; notes: string } {
  if (!dateSummary) {
    return { score: 0, notes: 'No date simulation available' }
  }

  let score = dateSummary.compatibilityScore

  // Adjust based on recommendation
  const recAdjustments: Record<string, number> = {
    'strong match': 10,
    'good match': 5,
    neutral: 0,
    'unlikely match': -10,
  }
  score += recAdjustments[dateSummary.recommendation] || 0

  // Green flags boost, red flags penalty
  score += dateSummary.greenFlags.length * 3
  score -= dateSummary.redFlags.length * 3

  return {
    score: Math.min(100, Math.max(0, score)),
    notes: `${dateSummary.recommendation}: ${dateSummary.overallSummary}`,
  }
}

/**
 * Calculate uncertainty penalty based on missing data
 */
function calculateUncertaintyPenalty(
  profileA: ProfileAnalysis,
  profileB: ProfileAnalysis,
): { penalty: number; uncertainties: string[] } {
  const uncertainties: string[] = []
  let penalty = 0

  if (profileA.confidenceNotes.overallConfidence === 'low') {
    penalty += 15
    uncertainties.push(`Limited data available for ${profileA.name}`)
  } else if (profileA.confidenceNotes.overallConfidence === 'medium') {
    penalty += 5
  }

  if (profileB.confidenceNotes.overallConfidence === 'low') {
    penalty += 15
    uncertainties.push(`Limited data available for ${profileB.name}`)
  } else if (profileB.confidenceNotes.overallConfidence === 'medium') {
    penalty += 5
  }

  if (profileA.hobbiesActivities.confirmed.length === 0) {
    penalty += 5
    uncertainties.push('No confirmed interests for person A')
  }

  if (profileB.hobbiesActivities.confirmed.length === 0) {
    penalty += 5
    uncertainties.push('No confirmed interests for person B')
  }

  return { penalty: Math.min(30, penalty), uncertainties }
}

export function calculateCompatibilityScore(
  profileA: ProfileAnalysis,
  profileB: ProfileAnalysis,
  dateSummary: DateSummary | null,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoreBreakdown {
  const sharedInterests = scoreSharedInterests(profileA, profileB)
  const preference = scorePreferenceAlignment(profileA, profileB)
  const lifestyle = scoreLifestyleCompatibility(profileA, profileB)
  const dateOutcome = scoreDateOutcome(dateSummary)
  const uncertainty = calculateUncertaintyPenalty(profileA, profileB)

  const weightedScore =
    sharedInterests.score * weights.sharedInterests +
    preference.score * weights.preferenceAlignment +
    lifestyle.score * weights.lifestyleCompatibility +
    dateOutcome.score * weights.dateOutcome

  const finalScore = Math.max(0, Math.round(weightedScore - uncertainty.penalty))

  return {
    totalScore: finalScore,
    sharedInterestsScore: Math.round(sharedInterests.score),
    preferenceScore: Math.round(preference.score),
    lifestyleScore: Math.round(lifestyle.score),
    dateOutcomeScore: Math.round(dateOutcome.score),
    uncertaintyPenalty: uncertainty.penalty,
    explanation: {
      sharedInterests: sharedInterests.sharedItems,
      preferenceMatches: preference.matches,
      lifestyleNotes: lifestyle.notes,
      dateOutcomeNotes: dateOutcome.notes,
      uncertainties: uncertainty.uncertainties,
      disclaimer:
        'This score is an algorithmic similarity indicator based on documented public information only. It does not scientifically predict romantic compatibility or success.',
    },
  }
}

/**
 * Generate a ranked list for a given person vs all others
 */
export function rankMatches(
  forPerson: { id: string; profile: ProfileAnalysis },
  candidates: Array<{ id: string; profile: ProfileAnalysis; dateSummary: DateSummary | null }>,
  weights?: ScoringWeights,
): Array<{ candidateId: string; score: ScoreBreakdown; rank: number }> {
  const scored = candidates
    .filter((c) => c.id !== forPerson.id) // exclude self
    .map((candidate) => ({
      candidateId: candidate.id,
      score: calculateCompatibilityScore(forPerson.profile, candidate.profile, candidate.dateSummary, weights),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .map((item, index) => ({ ...item, rank: index + 1 }))

  return scored
}
