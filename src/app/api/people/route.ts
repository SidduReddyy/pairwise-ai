import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateLinkedInUrl, validateInstagramUrl } from '@/lib/url-validation'
import { z } from 'zod'

const AddPersonSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  linkedinUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
}).refine(
  (data) => data.linkedinUrl || data.instagramUrl,
  { message: 'At least one of LinkedIn URL or Instagram URL is required' }
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const isSynthetic = searchParams.get('synthetic')

    const where = isSynthetic !== null
      ? { isSynthetic: isSynthetic === 'true' }
      : {}

    const [people, total] = await Promise.all([
      prisma.person.findMany({
        where,
        include: {
          profile: {
            select: {
              analysisStatus: true,
              linkedinStatus: true,
              instagramStatus: true,
              summary: true,
              analyzedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.person.count({ where }),
    ])

    return NextResponse.json({ people, total, page, limit })
  } catch (error) {
    console.error('GET /api/people error:', error)
    return NextResponse.json({ error: 'Failed to fetch people' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parse = AddPersonSchema.safeParse(body)

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parse.error.flatten() },
        { status: 400 }
      )
    }

    const { name, linkedinUrl, instagramUrl } = parse.data

    // Validate URLs
    if (linkedinUrl) {
      const liResult = validateLinkedInUrl(linkedinUrl)
      if (!liResult.valid) {
        return NextResponse.json(
          { error: `Invalid LinkedIn URL: ${liResult.error}` },
          { status: 400 }
        )
      }
    }

    if (instagramUrl) {
      const igResult = validateInstagramUrl(instagramUrl)
      if (!igResult.valid) {
        return NextResponse.json(
          { error: `Invalid Instagram URL: ${igResult.error}` },
          { status: 400 }
        )
      }
    }

    // Check for duplicates
    if (linkedinUrl) {
      const existing = await prisma.person.findFirst({
        where: { linkedinUrl },
      })
      if (existing) {
        return NextResponse.json(
          { error: `A person with this LinkedIn URL already exists: ${existing.name}` },
          { status: 409 }
        )
      }
    }

    if (instagramUrl) {
      const existing = await prisma.person.findFirst({
        where: { instagramUrl },
      })
      if (existing) {
        return NextResponse.json(
          { error: `A person with this Instagram URL already exists: ${existing.name}` },
          { status: 409 }
        )
      }
    }

    // Create person and initialize profile
    const person = await prisma.person.create({
      data: {
        name,
        linkedinUrl: linkedinUrl || null,
        instagramUrl: instagramUrl || null,
        isSynthetic: false,
        profile: {
          create: {
            linkedinStatus: linkedinUrl ? 'pending' : 'skipped',
            instagramStatus: instagramUrl ? 'pending' : 'skipped',
            analysisStatus: 'pending',
          },
        },
      },
      include: { profile: true },
    })

    // Log the action
    await prisma.runLog.create({
      data: {
        personId: person.id,
        stage: 'ingestion',
        status: 'success',
        message: `Person ${name} added`,
      },
    })

    return NextResponse.json({ person }, { status: 201 })
  } catch (error) {
    console.error('POST /api/people error:', error)
    return NextResponse.json({ error: 'Failed to add person' }, { status: 500 })
  }
}
