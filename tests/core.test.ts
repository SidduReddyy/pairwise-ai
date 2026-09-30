/**
 * Tests for URL validation, scoring, ranking, and workflow transitions.
 */

import { validateLinkedInUrl, validateInstagramUrl, extractLinkedInUsername, extractInstagramUsername } from '../src/lib/url-validation'
import { calculateCompatibilityScore, rankMatches, DEFAULT_WEIGHTS } from '../src/lib/scoring'
import type { ProfileAnalysis } from '../src/lib/ai/profile-analyzer'

// ===== URL VALIDATION TESTS =====

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`)
  }
  console.log(`  ✓ ${message}`)
}

function test(name: string, fn: () => void) {
  console.log(`\n${name}`)
  try {
    fn()
    console.log(`  → PASSED`)
  } catch (err) {
    console.error(`  → FAILED: ${(err as Error).message}`)
    process.exitCode = 1
  }
}

// LinkedIn URL tests
test('validateLinkedInUrl: valid URLs', () => {
  const validUrls = [
    'https://www.linkedin.com/in/john-doe',
    'https://linkedin.com/in/john-doe/',
    'https://www.linkedin.com/in/john_doe123/',
    'https://www.linkedin.com/in/jane-smith-mba',
  ]
  for (const url of validUrls) {
    const result = validateLinkedInUrl(url)
    assert(result.valid, `"${url}" should be valid`)
    assert(!!result.normalized, `"${url}" should have normalized form`)
  }
})

test('validateLinkedInUrl: invalid URLs', () => {
  const invalidUrls = [
    'not-a-url',
    'https://twitter.com/john-doe',
    'https://linkedin.com/company/acme',
    'https://linkedin.com/in/',
    '',
  ]
  for (const url of invalidUrls) {
    const result = validateLinkedInUrl(url)
    assert(!result.valid, `"${url}" should be invalid`)
    assert(!!result.error, `"${url}" should have an error message`)
  }
})

test('validateLinkedInUrl: normalizes URL', () => {
  const result = validateLinkedInUrl('https://linkedin.com/in/john-doe')
  assert(result.normalized === 'https://www.linkedin.com/in/john-doe/', 'Should normalize to www + trailing slash')
})

test('extractLinkedInUsername: extracts username', () => {
  const username = extractLinkedInUsername('https://www.linkedin.com/in/jane-smith-mba/')
  assert(username === 'jane-smith-mba', `Expected "jane-smith-mba", got "${username}"`)
})

// Instagram URL tests
test('validateInstagramUrl: valid URLs', () => {
  const validUrls = [
    'https://www.instagram.com/john_doe',
    'https://instagram.com/jane.smith/',
    'https://www.instagram.com/user123/',
  ]
  for (const url of validUrls) {
    const result = validateInstagramUrl(url)
    assert(result.valid, `"${url}" should be valid`)
  }
})

test('validateInstagramUrl: invalid URLs', () => {
  const invalidUrls = [
    'https://instagram.com/p/ABC123',        // post
    'https://instagram.com/reel/ABC123',     // reel
    'https://instagram.com/explore',         // reserved
    'https://twitter.com/user',              // wrong domain
    '',
  ]
  for (const url of invalidUrls) {
    const result = validateInstagramUrl(url)
    assert(!result.valid, `"${url}" should be invalid`)
  }
})

test('extractInstagramUsername: extracts username', () => {
  const username = extractInstagramUsername('https://www.instagram.com/jane.smith/')
  assert(username === 'jane.smith', `Expected "jane.smith", got "${username}"`)
})

// ===== SCORING TESTS =====

function makeProfile(name: string, overrides: Partial<ProfileAnalysis> = {}): ProfileAnalysis {
  return {
    name,
    professionalBackground: {
      currentRole: 'Software Engineer',
      industry: 'Technology',
      skills: ['Python', 'React', 'TypeScript'],
      experience: '5 years',
      education: 'BS Computer Science',
      observations: ['Experienced engineer'],
    },
    hobbiesActivities: {
      confirmed: ['hiking', 'photography', 'cooking'],
      inferred: ['travel', 'music'],
      sources: { hiking: 'instagram', photography: 'instagram', cooking: 'instagram' },
    },
    preferences: {
      stated: ['outdoor activities', 'intellectual conversations'],
      apparent: ['creative pursuits', 'health-conscious lifestyle'],
    },
    conversationStarters: [
      { topic: 'Hiking', starter: 'What trails do you love?', rationale: 'Shared interest', confidence: 'high' }
    ],
    evidenceSources: [
      { claim: 'Enjoys hiking', source: 'instagram', confidence: 'high', quote: undefined }
    ],
    confidenceNotes: {
      overallConfidence: 'high',
      knownGaps: [],
      uncertainties: [],
      disclaimer: 'Based on public data only',
    },
    summary: `${name} is an active software engineer who enjoys outdoor activities.`,
    ...overrides,
  }
}

test('calculateCompatibilityScore: high similarity profiles', () => {
  const profileA = makeProfile('Alice')
  const profileB = makeProfile('Bob')
  const score = calculateCompatibilityScore(profileA, profileB, null)
  assert(score.totalScore >= 0 && score.totalScore <= 100, 'Score should be 0-100')
  assert(score.sharedInterestsScore >= 0, 'Shared interests score should be >= 0')
  assert(score.totalScore > 20, 'High-similarity profiles should score > 20')
  console.log(`    Score: ${score.totalScore}/100`)
})

test('calculateCompatibilityScore: no shared interests', () => {
  const profileA = makeProfile('Alice', {
    hobbiesActivities: { confirmed: ['ballet', 'opera', 'fine dining'], inferred: [], sources: {} }
  })
  const profileB = makeProfile('Bob', {
    hobbiesActivities: { confirmed: ['surfing', 'skydiving', 'skateboarding'], inferred: [], sources: {} }
  })
  const score = calculateCompatibilityScore(profileA, profileB, null)
  assert(score.sharedInterestsScore === 0 || score.sharedInterestsScore < 30, 'Dissimilar interests should score low')
  console.log(`    Score: ${score.totalScore}/100 (shared interests: ${score.sharedInterestsScore})`)
})

test('calculateCompatibilityScore: with date summary', () => {
  const profileA = makeProfile('Alice')
  const profileB = makeProfile('Bob')
  const dateSummary = {
    sharedInterests: ['hiking', 'photography'],
    differences: ['career focus'],
    unansweredQuestions: ['long-term goals'],
    compatibilityScore: 85,
    agentAReasoning: 'Great chemistry',
    agentBReasoning: 'Lots in common',
    overallSummary: 'Strong match',
    redFlags: [],
    greenFlags: ['shared passion for outdoors', 'similar communication style'],
    recommendation: 'strong match' as const,
  }
  const score = calculateCompatibilityScore(profileA, profileB, dateSummary)
  assert(score.dateOutcomeScore > 50, 'Strong match date should score > 50')
  console.log(`    Score with date: ${score.totalScore}/100`)
})

test('calculateCompatibilityScore: uncertainty penalty for low confidence', () => {
  const profileA = makeProfile('Alice', {
    confidenceNotes: { overallConfidence: 'low', knownGaps: ['No LinkedIn data'], uncertainties: ['Limited public info'], disclaimer: '' },
    hobbiesActivities: { confirmed: [], inferred: [], sources: {} }
  })
  const profileB = makeProfile('Bob', {
    confidenceNotes: { overallConfidence: 'low', knownGaps: ['No Instagram data'], uncertainties: [], disclaimer: '' },
    hobbiesActivities: { confirmed: [], inferred: [], sources: {} }
  })
  const score = calculateCompatibilityScore(profileA, profileB, null)
  assert(score.uncertaintyPenalty > 0, 'Low confidence profiles should have uncertainty penalty')
  console.log(`    Uncertainty penalty: ${score.uncertaintyPenalty} points`)
})

// ===== RANKING TESTS =====

test('rankMatches: excludes self-matches', () => {
  const personA = { id: 'a', profile: makeProfile('Alice') }
  const candidates = [
    { id: 'a', profile: makeProfile('Alice'), dateSummary: null },
    { id: 'b', profile: makeProfile('Bob'), dateSummary: null },
    { id: 'c', profile: makeProfile('Carol'), dateSummary: null },
  ]
  const rankings = rankMatches(personA, candidates)
  assert(!rankings.some((r) => r.candidateId === 'a'), 'Should not include self in rankings')
  assert(rankings.length === 2, `Should have 2 candidates, got ${rankings.length}`)
})

test('rankMatches: returns descending score order', () => {
  const forPerson = { id: 'z', profile: makeProfile('Zara') }
  const candidates = [
    { id: 'a', profile: makeProfile('Alice'), dateSummary: null },
    { id: 'b', profile: makeProfile('Bob'), dateSummary: null },
    { id: 'c', profile: makeProfile('Carol', { hobbiesActivities: { confirmed: [], inferred: [], sources: {} } }), dateSummary: null },
  ]
  const rankings = rankMatches(forPerson, candidates)
  for (let i = 1; i < rankings.length; i++) {
    assert(
      rankings[i - 1].score.totalScore >= rankings[i].score.totalScore,
      `Rank ${i} should have score >= rank ${i + 1}`
    )
  }
  assert(rankings[0].rank === 1, 'First result should have rank 1')
})

test('rankMatches: assigns sequential ranks', () => {
  const forPerson = { id: 'z', profile: makeProfile('Zara') }
  const candidates = [
    { id: 'a', profile: makeProfile('Alice'), dateSummary: null },
    { id: 'b', profile: makeProfile('Bob'), dateSummary: null },
    { id: 'c', profile: makeProfile('Carol'), dateSummary: null },
  ]
  const rankings = rankMatches(forPerson, candidates)
  for (let i = 0; i < rankings.length; i++) {
    assert(rankings[i].rank === i + 1, `Rank at index ${i} should be ${i + 1}`)
  }
})

console.log('\n\n=== All tests complete ===\n')
