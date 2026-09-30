import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        profile: true,
        sessionsAsA: {
          include: { personB: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        sessionsAsB: {
          include: { personA: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        rankingsFor: {
          include: { rankedPerson: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { rank: 'asc' },
          take: 25,
        },
      },
    })

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    return NextResponse.json({ person })
  } catch (error) {
    console.error('GET /api/people/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.person.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/people/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 })
  }
}
