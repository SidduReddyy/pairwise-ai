import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SYNTHETIC_PEOPLE } from '@/lib/demo-data'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const clearExisting = body.clearExisting === true

    if (clearExisting) {
      // Delete all synthetic data
      await prisma.ranking.deleteMany({
        where: { forPerson: { isSynthetic: true } },
      })
      await prisma.datingSession.deleteMany({
        where: { OR: [{ personA: { isSynthetic: true } }, { personB: { isSynthetic: true } }] },
      })
      await prisma.person.deleteMany({ where: { isSynthetic: true } })
    }

    // Check how many synthetic people already exist
    const existingCount = await prisma.person.count({ where: { isSynthetic: true } })

    const created = []

    for (let i = 0; i < SYNTHETIC_PEOPLE.length; i++) {
      const synthetic = SYNTHETIC_PEOPLE[i]

      // Skip if this person already exists
      const existing = await prisma.person.findFirst({
        where: { linkedinUrl: synthetic.linkedinUrl, isSynthetic: true },
      })
      if (existing) {
        created.push({ id: existing.id, name: synthetic.name, alreadyExisted: true })
        continue
      }

      // Create the person with pre-loaded synthetic data
      const person = await prisma.person.create({
        data: {
          name: synthetic.name,
          linkedinUrl: synthetic.linkedinUrl,
          instagramUrl: synthetic.instagramUrl,
          isSynthetic: true,
          profile: {
            create: {
              linkedinStatus: 'success',
              instagramStatus: 'success',
              linkedinRaw: JSON.stringify(synthetic.linkedinData),
              instagramRaw: JSON.stringify(synthetic.instagramData),
              analysisStatus: 'pending',
            },
          },
        },
      })

      created.push({ id: person.id, name: synthetic.name, alreadyExisted: false })
    }

    await prisma.runLog.create({
      data: {
        stage: 'ingestion',
        status: 'success',
        message: `Seed completed: ${created.filter((c) => !c.alreadyExisted).length} new synthetic people created, ${created.filter((c) => c.alreadyExisted).length} already existed`,
      },
    })

    return NextResponse.json({
      success: true,
      created,
      newCount: created.filter((c) => !c.alreadyExisted).length,
      existingCount: created.filter((c) => c.alreadyExisted).length,
      totalSynthetic: created.length,
    })
  } catch (error) {
    console.error('POST /api/seed error:', error)
    return NextResponse.json(
      { error: 'Seed failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  const count = await prisma.person.count({ where: { isSynthetic: true } })
  return NextResponse.json({ syntheticCount: count, totalSynthetic: SYNTHETIC_PEOPLE.length })
}
