import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateCompatibilityScore, rankMatches, DEFAULT_WEIGHTS } from '@/lib/scoring'
import type { ProfileAnalysis } from '@/lib/ai/profile-analyzer'
import type { DateSummary } from '@/lib/ai/dating-agent'

function parseProfile(profile: {
  professionalBackground?: string | null
  hobbiesActivities?: string | null
  preferences?: string | null
  conversationStarters?: string | null
  evidenceSources?: string | null
  confidenceNotes?: string | null
  summary?: string | null
}, name: string): ProfileAnalysis {
  return {
    name,
    professionalBackground: JSON.parse(profile.professionalBackground || '{"observations":[]}'),
    hobbiesActivities: JSON.parse(profile.hobbiesActivities || '{"confirmed":[],"inferred":[],"sources":{}}'),
    preferences: JSON.parse(profile.preferences || '{"stated":[],"apparent":[]}'),
    conversationStarters: JSON.parse(profile.conversationStarters || '[]'),
    evidenceSources: JSON.parse(profile.evidenceSources || '[]'),
    confidenceNotes: JSON.parse(profile.confidenceNotes || '{"overallConfidence":"low","knownGaps":[],"uncertainties":[],"disclaimer":""}'),
    summary: profile.summary || '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const forPersonId = body.personId as string | undefined

    // Get all people with completed profiles
    const people = await prisma.person.findMany({
      where: { profile: { analysisStatus: 'done' } },
      include: { profile: true },
    })

    if (people.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 people with completed profiles are needed to generate rankings' },
        { status: 400 }
      )
    }

    // Get all completed sessions for date outcome scores
    const sessions = await prisma.datingSession.findMany({
      where: { status: 'done' },
    })

    // Build session lookup: personAId+personBId -> summary
    const sessionMap = new Map<string, DateSummary>()
    for (const session of sessions) {
      if (session.summary) {
        const key1 = `${session.personAId}:${session.personBId}`
        const key2 = `${session.personBId}:${session.personAId}`
        const summary = JSON.parse(session.summary)
        sessionMap.set(key1, summary)
        sessionMap.set(key2, summary)
      }
    }

    // Determine which people to rank for
    const peopleToRankFor = forPersonId
      ? people.filter((p) => p.id === forPersonId)
      : people

    const allRankings = []

    for (const person of peopleToRankFor) {
      if (!person.profile) continue

      const personProfile = parseProfile(person.profile, person.name)

      const candidates = people
        .filter((p) => p.id !== person.id && p.profile)
        .map((p) => ({
          id: p.id,
          profile: parseProfile(p.profile!, p.name),
          dateSummary: sessionMap.get(`${person.id}:${p.id}`) || null,
        }))

      const ranked = rankMatches({ id: person.id, profile: personProfile }, candidates)

      // Upsert rankings in DB
      for (const ranking of ranked) {
        const session = await prisma.datingSession.findFirst({
          where: {
            OR: [
              { personAId: person.id, personBId: ranking.candidateId },
              { personAId: ranking.candidateId, personBId: person.id },
            ],
            status: 'done',
          },
        })

        await prisma.ranking.upsert({
          where: {
            forPersonId_rankedPersonId: {
              forPersonId: person.id,
              rankedPersonId: ranking.candidateId,
            },
          },
          create: {
            forPersonId: person.id,
            rankedPersonId: ranking.candidateId,
            sessionId: session?.id || null,
            rank: ranking.rank,
            totalScore: ranking.score.totalScore,
            sharedInterestsScore: ranking.score.sharedInterestsScore,
            preferenceScore: ranking.score.preferenceScore,
            lifestyleScore: ranking.score.lifestyleScore,
            dateOutcomeScore: ranking.score.dateOutcomeScore,
            uncertaintyPenalty: ranking.score.uncertaintyPenalty,
            explanation: JSON.stringify(ranking.score.explanation),
          },
          update: {
            sessionId: session?.id || null,
            rank: ranking.rank,
            totalScore: ranking.score.totalScore,
            sharedInterestsScore: ranking.score.sharedInterestsScore,
            preferenceScore: ranking.score.preferenceScore,
            lifestyleScore: ranking.score.lifestyleScore,
            dateOutcomeScore: ranking.score.dateOutcomeScore,
            uncertaintyPenalty: ranking.score.uncertaintyPenalty,
            explanation: JSON.stringify(ranking.score.explanation),
          },
        })

        allRankings.push({
          forPersonId: person.id,
          forPersonName: person.name,
          ...ranking,
        })
      }

      await prisma.runLog.create({
        data: {
          personId: person.id,
          stage: 'ranking',
          status: 'success',
          message: `Rankings generated for ${person.name}: ${ranked.length} matches ranked`,
        },
      })
    }

    return NextResponse.json({ success: true, rankingsGenerated: allRankings.length })
  } catch (error) {
    console.error('POST /api/rankings error:', error)
    return NextResponse.json(
      { error: 'Ranking failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const forPersonId = searchParams.get('personId')

    const where = forPersonId ? { forPersonId } : {}

    const rankings = await prisma.ranking.findMany({
      where,
      include: {
        forPerson: { select: { id: true, name: true, avatarUrl: true, isSynthetic: true } },
        rankedPerson: {
          select: {
            id: true, name: true, avatarUrl: true, isSynthetic: true,
            profile: { select: { summary: true, hobbiesActivities: true, analysisStatus: true } },
          },
        },
        session: {
          select: { id: true, status: true, compatibilityScore: true, completedAt: true },
        },
      },
      orderBy: [{ forPersonId: 'asc' }, { rank: 'asc' }],
    })

    return NextResponse.json({ rankings })
  } catch (error) {
    console.error('GET /api/rankings error:', error)
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
  }
}
