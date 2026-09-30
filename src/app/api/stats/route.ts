import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const [totalPeople, syntheticPeople, totalProfiles, totalSessions, totalRankings] =
      await Promise.all([
        prisma.person.count(),
        prisma.person.count({ where: { isSynthetic: true } }),
        prisma.profile.count({ where: { analysisStatus: 'done' } }),
        prisma.datingSession.count({ where: { status: 'done' } }),
        prisma.ranking.count(),
      ])

    const profileStatuses = await prisma.profile.groupBy({
      by: ['analysisStatus'],
      _count: { personId: true },
    })

    const sessionStatuses = await prisma.datingSession.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const recentLogs = await prisma.runLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        person: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      totalPeople,
      syntheticPeople,
      realPeople: totalPeople - syntheticPeople,
      totalProfiles,
      totalSessions,
      totalRankings,
      profileStatuses: Object.fromEntries(
        profileStatuses.map((s) => [s.analysisStatus, s._count.personId])
      ),
      sessionStatuses: Object.fromEntries(
        sessionStatuses.map((s) => [s.status, s._count.id])
      ),
      recentLogs,
    })
  } catch (error) {
    console.error('GET /api/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
