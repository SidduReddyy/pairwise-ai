import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runDatingSession } from '@/lib/ai/dating-agent'
import type { ProfileAnalysis } from '@/lib/ai/profile-analyzer'
import { z } from 'zod'

const StartSessionSchema = z.object({
  personAId: z.string(),
  personBId: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const personId = searchParams.get('personId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const where = personId
      ? { OR: [{ personAId: personId }, { personBId: personId }] }
      : {}

    const [sessions, total] = await Promise.all([
      prisma.datingSession.findMany({
        where,
        include: {
          personA: { select: { id: true, name: true, avatarUrl: true, isSynthetic: true } },
          personB: { select: { id: true, name: true, avatarUrl: true, isSynthetic: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.datingSession.count({ where }),
    ])

    return NextResponse.json({ sessions, total, page, limit })
  } catch (error) {
    console.error('GET /api/sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parse = StartSessionSchema.safeParse(body)

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parse.error.flatten() },
        { status: 400 }
      )
    }

    const { personAId, personBId } = parse.data

    if (personAId === personBId) {
      return NextResponse.json({ error: 'Cannot create a session between the same person' }, { status: 400 })
    }

    // Check both people exist and have completed profiles
    const [personA, personB] = await Promise.all([
      prisma.person.findUnique({
        where: { id: personAId },
        include: { profile: true },
      }),
      prisma.person.findUnique({
        where: { id: personBId },
        include: { profile: true },
      }),
    ])

    if (!personA || !personB) {
      return NextResponse.json({ error: 'One or both people not found' }, { status: 404 })
    }

    if (personA.profile?.analysisStatus !== 'done' || personB.profile?.analysisStatus !== 'done') {
      return NextResponse.json(
        { error: 'Both people must have completed profile analysis before a dating session' },
        { status: 400 }
      )
    }

    // Check for existing session
    const existingSession = await prisma.datingSession.findFirst({
      where: {
        OR: [
          { personAId, personBId },
          { personAId: personBId, personBId: personAId },
        ],
      },
    })

    if (existingSession && existingSession.status === 'done') {
      return NextResponse.json(
        { error: 'A session already exists between these two people', sessionId: existingSession.id },
        { status: 409 }
      )
    }

    // Create or reset session
    const session = existingSession
      ? await prisma.datingSession.update({
          where: { id: existingSession.id },
          data: { status: 'pending', error: null, dialogue: null, summary: null },
        })
      : await prisma.datingSession.create({
          data: { personAId, personBId, status: 'pending' },
        })

    // Parse profiles
    const parseProfile = (p: typeof personA): ProfileAnalysis => ({
      name: p.name,
      professionalBackground: JSON.parse(p.profile!.professionalBackground || '{"observations":[]}'),
      hobbiesActivities: JSON.parse(p.profile!.hobbiesActivities || '{"confirmed":[],"inferred":[],"sources":{}}'),
      preferences: JSON.parse(p.profile!.preferences || '{"stated":[],"apparent":[]}'),
      conversationStarters: JSON.parse(p.profile!.conversationStarters || '[]'),
      evidenceSources: JSON.parse(p.profile!.evidenceSources || '[]'),
      confidenceNotes: JSON.parse(p.profile!.confidenceNotes || '{"overallConfidence":"low","knownGaps":[],"uncertainties":[],"disclaimer":""}'),
      summary: p.profile!.summary || '',
    })

    // Update to running
    await prisma.datingSession.update({
      where: { id: session.id },
      data: { status: 'running', startedAt: new Date() },
    })

    await prisma.runLog.create({
      data: {
        personId: personAId,
        stage: 'dating',
        status: 'running',
        message: `Dating session started: ${personA.name} ↔ ${personB.name}`,
      },
    })

    // Run the dating session
    const result = await runDatingSession(
      { id: personAId, name: personA.name, profile: parseProfile(personA) },
      { id: personBId, name: personB.name, profile: parseProfile(personB) },
    )

    // Save results
    const updatedSession = await prisma.datingSession.update({
      where: { id: session.id },
      data: {
        status: 'done',
        dialogue: JSON.stringify(result.dialogue),
        summary: JSON.stringify(result.summary),
        sharedInterests: JSON.stringify(result.summary.sharedInterests),
        differences: JSON.stringify(result.summary.differences),
        unansweredQuestions: JSON.stringify(result.summary.unansweredQuestions),
        compatibilityScore: result.summary.compatibilityScore,
        completedAt: new Date(),
      },
      include: {
        personA: { select: { id: true, name: true } },
        personB: { select: { id: true, name: true } },
      },
    })

    await prisma.runLog.create({
      data: {
        personId: personAId,
        stage: 'dating',
        status: 'success',
        message: `Session completed: compatibility score ${result.summary.compatibilityScore}`,
      },
    })

    return NextResponse.json({ session: updatedSession, result }, { status: 201 })
  } catch (error) {
    console.error('POST /api/sessions error:', error)
    return NextResponse.json(
      { error: 'Session failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
