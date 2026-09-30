/**
 * Dating Agent Engine
 * Simulates a date conversation between two AI agents, each representing one person.
 * 
 * IMPORTANT: These are AI simulations based on documented public profiles.
 * They are NOT real conversations between real people.
 * All dialogue is clearly labeled as simulated.
 */

import { generateJSON, generateText } from '../ai/gemini'
import type { ProfileAnalysis } from './profile-analyzer'

export interface DialogueTurn {
  speaker: 'A' | 'B'
  speakerName: string
  message: string
  turnNumber: number
}

export interface DateSummary {
  sharedInterests: string[]
  differences: string[]
  unansweredQuestions: string[]
  compatibilityScore: number  // 0-100
  agentAReasoning: string
  agentBReasoning: string
  overallSummary: string
  redFlags: string[]
  greenFlags: string[]
  recommendation: string
}

export interface DateResult {
  dialogue: DialogueTurn[]
  summary: DateSummary
}

const AGENT_SYSTEM_INSTRUCTION = (personName: string) => `You are an AI agent representing ${personName} in a simulated date conversation for Pairwise AI, a dating compatibility platform.

CRITICAL RULES:
1. You are a SIMULATION based on documented public information about ${personName}. This is NOT a real conversation.
2. Only express interests, preferences, and opinions that are supported by the person's documented profile.
3. Be warm, genuine, and conversational — as this person might actually be.
4. Ask thoughtful questions based on your own interests and what you notice about the other person.
5. Do NOT invent biographical details not in the profile.
6. Keep responses to 2-4 sentences per turn for natural conversation flow.
7. Remember: this is a demo simulation. All dialogue will be clearly labeled as AI-simulated.`

export async function runDatingSession(
  personA: { id: string; name: string; profile: ProfileAnalysis },
  personB: { id: string; name: string; profile: ProfileAnalysis },
  maxTurns = 8,
): Promise<DateResult> {
  const dialogue: DialogueTurn[] = []

  // Build context for each agent
  const agentAContext = buildAgentContext(personA.name, personA.profile)
  const agentBContext = buildAgentContext(personB.name, personB.profile)

  // Generate conversation turn by turn
  const conversationHistory: string[] = []

  for (let turn = 0; turn < maxTurns; turn++) {
    const isAgentA = turn % 2 === 0
    const speaker = isAgentA ? personA : personB
    const listener = isAgentA ? personB : personA
    const speakerContext = isAgentA ? agentAContext : agentBContext

    const historyText = conversationHistory.length > 0
      ? `\nConversation so far:\n${conversationHistory.join('\n')}`
      : ''

    const prompt = isAgentA && turn === 0
      ? `${speakerContext}

You are on a first date with ${listener.name}. Here's what you know about them:
${buildAgentContext(listener.name, listener.profile)}

Start the conversation naturally. Introduce yourself and ask an engaging opening question based on something from your profile or theirs.`
      : `${speakerContext}

You are on a first date with ${listener.name}. Here's what you know about them:
${buildAgentContext(listener.name, listener.profile)}
${historyText}

Continue the conversation naturally. Respond to what was last said and keep the dialogue flowing.`

    const response = await generateText(prompt, AGENT_SYSTEM_INSTRUCTION(speaker.name))
    const cleanResponse = response.trim()

    dialogue.push({
      speaker: isAgentA ? 'A' : 'B',
      speakerName: speaker.name,
      message: cleanResponse,
      turnNumber: turn + 1,
    })

    conversationHistory.push(`${speaker.name}: ${cleanResponse}`)
  }

  // Generate structured summary
  const summary = await generateDateSummary(personA, personB, dialogue)

  return { dialogue, summary }
}

function buildAgentContext(name: string, profile: ProfileAnalysis): string {
  const parts = [
    `Your name is ${name}.`,
    `Your professional background: ${profile.professionalBackground.observations.join('. ')}`,
    `Your confirmed interests and hobbies: ${profile.hobbiesActivities.confirmed.join(', ')}`,
  ]

  if (profile.preferences.stated.length > 0) {
    parts.push(`Your stated preferences: ${profile.preferences.stated.join(', ')}`)
  }

  if (profile.conversationStarters.length > 0) {
    const starters = profile.conversationStarters
      .filter((cs) => cs.confidence !== 'low')
      .map((cs) => cs.topic)
      .slice(0, 3)
    parts.push(`Topics you enjoy discussing: ${starters.join(', ')}`)
  }

  parts.push(`Your summary: ${profile.summary}`)

  return parts.join('\n')
}

async function generateDateSummary(
  personA: { name: string; profile: ProfileAnalysis },
  personB: { name: string; profile: ProfileAnalysis },
  dialogue: DialogueTurn[],
): Promise<DateSummary> {
  const dialogueText = dialogue
    .map((d) => `${d.speakerName}: ${d.message}`)
    .join('\n')

  const prompt = `Analyze this simulated date conversation between ${personA.name} and ${personB.name}:

CONVERSATION:
${dialogueText}

PERSON A PROFILE SUMMARY: ${personA.profile.summary}
PERSON A INTERESTS: ${personA.profile.hobbiesActivities.confirmed.join(', ')}

PERSON B PROFILE SUMMARY: ${personB.profile.summary}
PERSON B INTERESTS: ${personB.profile.hobbiesActivities.confirmed.join(', ')}

Generate a structured summary. Return JSON only:
{
  "sharedInterests": ["string - interests that came up for both"],
  "differences": ["string - meaningful differences that emerged"],
  "unansweredQuestions": ["string - things they should explore further"],
  "compatibilityScore": 0-100,
  "agentAReasoning": "string - why A might or might not be interested in B",
  "agentBReasoning": "string - why B might or might not be interested in A",
  "overallSummary": "string - 2-3 sentence overall assessment",
  "redFlags": ["string - potential incompatibilities"],
  "greenFlags": ["string - strong compatibility signals"],
  "recommendation": "strong match|good match|neutral|unlikely match"
}`

  return generateJSON<DateSummary>(
    prompt,
    'You are an expert relationship counselor analyzing AI-simulated date conversations. Be balanced, constructive, and honest. Output valid JSON only.',
  )
}
