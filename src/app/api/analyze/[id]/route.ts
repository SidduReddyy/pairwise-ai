import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchLinkedInProfile } from '@/lib/adapters/linkedin'
import { fetchInstagramProfile } from '@/lib/adapters/instagram'
import { analyzeProfile } from '@/lib/ai/profile-analyzer'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const person = await prisma.person.findUnique({
      where: { id },
      include: { profile: true },
    })

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    if (!person.profile) {
      return NextResponse.json({ error: 'Profile record not found' }, { status: 404 })
    }

    // Update status to running
    await prisma.profile.update({
      where: { personId: id },
      data: { analysisStatus: 'running' },
    })

    await prisma.runLog.create({
      data: {
        personId: id,
        stage: 'ingestion',
        status: 'running',
        message: `Starting data retrieval for ${person.name}`,
      },
    })

    // Fetch LinkedIn data
    let linkedinData = null
    let linkedinStatus = 'skipped'
    let linkedinRaw = null

    if (person.linkedinUrl) {
      await prisma.profile.update({
        where: { personId: id },
        data: { linkedinStatus: 'fetching' },
      })

      const linkedinResult = await fetchLinkedInProfile(person.linkedinUrl)
      linkedinData = linkedinResult.data
      linkedinStatus = linkedinResult.status === 'success' || linkedinResult.status === 'partial'
        ? 'success'
        : linkedinResult.status === 'manual_required'
        ? 'skipped'
        : 'failed'
      linkedinRaw = JSON.stringify({ ...linkedinResult.data, _message: linkedinResult.message })

      await prisma.profile.update({
        where: { personId: id },
        data: {
          linkedinStatus,
          linkedinRaw,
        },
      })

      await prisma.runLog.create({
        data: {
          personId: id,
          stage: 'ingestion',
          status: linkedinStatus === 'failed' ? 'failed' : 'success',
          message: `LinkedIn: ${linkedinResult.message}`,
        },
      })
    }

    // Fetch Instagram data
    let instagramData = null
    let instagramStatus = 'skipped'
    let instagramRaw = null

    if (person.instagramUrl) {
      await prisma.profile.update({
        where: { personId: id },
        data: { instagramStatus: 'fetching' },
      })

      const instagramResult = await fetchInstagramProfile(person.instagramUrl)
      instagramData = instagramResult.data
      instagramStatus =
        instagramResult.status === 'success' || instagramResult.status === 'partial'
          ? 'success'
          : instagramResult.status === 'manual_required'
          ? 'skipped'
          : 'failed'
      instagramRaw = JSON.stringify({ ...instagramResult.data, _message: instagramResult.message })

      await prisma.profile.update({
        where: { personId: id },
        data: {
          instagramStatus,
          instagramRaw,
        },
      })

      await prisma.runLog.create({
        data: {
          personId: id,
          stage: 'ingestion',
          status: instagramStatus === 'failed' ? 'failed' : 'success',
          message: `Instagram: ${instagramResult.message}`,
        },
      })
    }

    // For synthetic profiles, use the stored raw data
    if (person.isSynthetic) {
      const profileRecord = await prisma.profile.findUnique({ where: { personId: id } })
      if (profileRecord?.linkedinRaw) {
        linkedinData = JSON.parse(profileRecord.linkedinRaw)
      }
      if (profileRecord?.instagramRaw) {
        instagramData = JSON.parse(profileRecord.instagramRaw)
      }
    }

    // Run AI analysis
    await prisma.runLog.create({
      data: {
        personId: id,
        stage: 'analysis',
        status: 'running',
        message: `Running AI profile analysis for ${person.name}`,
      },
    })

    const analysis = await analyzeProfile(
      person.name,
      linkedinData,
      instagramData,
      person.isSynthetic,
    )

    // Save analysis results
    await prisma.profile.update({
      where: { personId: id },
      data: {
        analysisStatus: 'done',
        professionalBackground: JSON.stringify(analysis.professionalBackground),
        hobbiesActivities: JSON.stringify(analysis.hobbiesActivities),
        preferences: JSON.stringify(analysis.preferences),
        conversationStarters: JSON.stringify(analysis.conversationStarters),
        evidenceSources: JSON.stringify(analysis.evidenceSources),
        confidenceNotes: JSON.stringify(analysis.confidenceNotes),
        summary: analysis.summary,
        analyzedAt: new Date(),
        analysisError: null,
      },
    })

    await prisma.runLog.create({
      data: {
        personId: id,
        stage: 'analysis',
        status: 'success',
        message: `Profile analysis completed for ${person.name}`,
      },
    })

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error(`POST /api/analyze/${id} error:`, error)

    // Mark as failed
    try {
      await prisma.profile.update({
        where: { personId: id },
        data: {
          analysisStatus: 'failed',
          analysisError: error instanceof Error ? error.message : String(error),
        },
      })

      await prisma.runLog.create({
        data: {
          personId: id,
          stage: 'analysis',
          status: 'failed',
          message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      })
    } catch {}

    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
