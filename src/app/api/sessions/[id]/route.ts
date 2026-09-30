import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await prisma.datingSession.findUnique({
      where: { id },
      include: {
        personA: {
          select: { id: true, name: true, avatarUrl: true, isSynthetic: true },
        },
        personB: {
          select: { id: true, name: true, avatarUrl: true, isSynthetic: true },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
