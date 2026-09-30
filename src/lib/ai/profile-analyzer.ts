/**
 * Profile Analysis Engine
 * Uses Gemini to generate structured profile analysis from retrieved social data.
 */

import { generateJSON } from '../ai/gemini'

export interface ProfileAnalysis {
  name: string
  professionalBackground: {
    currentRole?: string
    industry?: string
    skills?: string[]
    experience?: string
    education?: string
    observations: string[]
  }
  hobbiesActivities: {
    confirmed: string[]  // evidenced by source data
    inferred: string[]   // hypothesized but not confirmed
    sources: Record<string, string>  // hobby -> source
  }
  preferences: {
    stated: string[]     // explicitly stated preferences
    apparent: string[]   // apparent from evidence
  }
  conversationStarters: Array<{
    topic: string
    starter: string
    rationale: string
    confidence: 'high' | 'medium' | 'low'
  }>
  evidenceSources: Array<{
    claim: string
    source: 'linkedin' | 'instagram' | 'inferred'
    confidence: 'high' | 'medium' | 'low'
    quote?: string
  }>
  confidenceNotes: {
    overallConfidence: 'high' | 'medium' | 'low'
    knownGaps: string[]
    uncertainties: string[]
    disclaimer: string
  }
  summary: string
}

const ANALYSIS_SYSTEM_INSTRUCTION = `You are a careful, ethical profile analyst for a dating compatibility platform.

STRICT RULES:
1. ONLY make claims that are directly supported by the provided source data.
2. Clearly distinguish "confirmed" (evidenced) from "inferred" (hypothesized) information.
3. NEVER infer sensitive personal characteristics (sexual orientation, religion, politics, mental health, etc.) unless explicitly and publicly stated.
4. NEVER claim to know someone's private romantic preferences unless explicitly stated.
5. Use confident language only when the evidence is strong.
6. Acknowledge gaps and unknowns honestly.
7. This is for a DEMO/prototype platform. Be constructive and positive while remaining accurate.

Output valid JSON only, no markdown fences.`

export async function analyzeProfile(
  personName: string,
  linkedinData: Record<string, unknown> | null,
  instagramData: Record<string, unknown> | null,
  isSynthetic: boolean = false,
): Promise<ProfileAnalysis> {
  const dataDescription = []

  if (linkedinData) {
    dataDescription.push(`LINKEDIN DATA:
Name: ${linkedinData.name || 'Unknown'}
Headline: ${linkedinData.headline || 'Not available'}
About: ${linkedinData.about || 'Not available'}
Skills: ${Array.isArray(linkedinData.skills) ? linkedinData.skills.join(', ') : 'Not available'}
Source quality: ${linkedinData.source}`)
  } else {
    dataDescription.push('LINKEDIN DATA: Not available (retrieval failed or not provided)')
  }

  if (instagramData) {
    dataDescription.push(`INSTAGRAM DATA:
Username: ${instagramData.username}
Display name: ${instagramData.displayName || 'Unknown'}
Bio: ${instagramData.bio || 'Not available'}
Hashtags from bio: ${Array.isArray(instagramData.hashtags) ? instagramData.hashtags.join(', ') : 'None'}
Recent captions sample: ${Array.isArray(instagramData.recentCaptions) ? instagramData.recentCaptions.slice(0, 5).join(' | ') : 'Not available'}
Source quality: ${instagramData.source}`)
  } else {
    dataDescription.push('INSTAGRAM DATA: Not available (retrieval failed or not provided)')
  }

  if (isSynthetic) {
    dataDescription.push('\n⚠️ SYNTHETIC DEMO PROFILE: This is entirely synthetic/fictional data for demonstration purposes. Generate a vivid, realistic-seeming but clearly fictional profile.')
  }

  const prompt = `Analyze the following public social media data for ${personName} and generate a structured profile analysis.

${dataDescription.join('\n\n')}

Return a JSON object matching this exact structure:
{
  "name": "string",
  "professionalBackground": {
    "currentRole": "string or null",
    "industry": "string or null", 
    "skills": ["string"],
    "experience": "string or null",
    "education": "string or null",
    "observations": ["string"]
  },
  "hobbiesActivities": {
    "confirmed": ["string"],
    "inferred": ["string"],
    "sources": {"hobby": "source description"}
  },
  "preferences": {
    "stated": ["string"],
    "apparent": ["string"]
  },
  "conversationStarters": [
    {
      "topic": "string",
      "starter": "string",
      "rationale": "string",
      "confidence": "high|medium|low"
    }
  ],
  "evidenceSources": [
    {
      "claim": "string",
      "source": "linkedin|instagram|inferred",
      "confidence": "high|medium|low",
      "quote": "string or null"
    }
  ],
  "confidenceNotes": {
    "overallConfidence": "high|medium|low",
    "knownGaps": ["string"],
    "uncertainties": ["string"],
    "disclaimer": "string"
  },
  "summary": "A 2-3 sentence summary of the person based on available evidence"
}`

  return generateJSON<ProfileAnalysis>(prompt, ANALYSIS_SYSTEM_INSTRUCTION)
}
