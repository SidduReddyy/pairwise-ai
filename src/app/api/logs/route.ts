import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (status) where.status = status

    const [logs, total] = await Promise.all([
      prisma.runLog.findMany({
        where,
        include: {
          person: { select: { id: true, name: true, isSynthetic: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.runLog.count({ where }),
    ])

    // Summary stats
    const stats = await prisma.runLog.groupBy({
      by: ['stage', 'status'],
      _count: { id: true },
    })

    return NextResponse.json({ logs, total, page, limit, stats })
  } catch (error) {
    console.error('GET /api/logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
