/**
 * Gemini AI Provider Adapter
 * Server-side only — never expose API keys to client.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { aiRateLimiter, withRetry } from '../rate-limiter'

let _client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }
    _client = new GoogleGenerativeAI(apiKey)
  }
  return _client
}

function getModel(modelName = 'gemini-1.5-flash'): GenerativeModel {
  return getClient().getGenerativeModel({ model: modelName })
}

export interface GeminiMessage {
  role: 'user' | 'model'
  content: string
}

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  modelName?: string,
): Promise<string> {
  return aiRateLimiter.run(() =>
    withRetry(async () => {
      const model = getModel(modelName)
      const result = await model.generateContent({
        systemInstruction: systemInstruction
          ? { role: 'user', parts: [{ text: systemInstruction }] }
          : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      })
      const text = result.response.text()
      if (!text) throw new Error('Empty response from Gemini')
      return text
    }),
  )
}

export async function generateJSON<T>(
  prompt: string,
  systemInstruction?: string,
): Promise<T> {
  const text = await generateText(prompt, systemInstruction)
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Try to extract JSON object/array from response
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (match) {
      return JSON.parse(match[0]) as T
    }
    throw new Error(`Failed to parse JSON from AI response: ${cleaned.slice(0, 200)}`)
  }
}

export async function generateMultiTurnDialogue(
  messages: GeminiMessage[],
  systemInstruction?: string,
): Promise<string> {
  return aiRateLimiter.run(() =>
    withRetry(async () => {
      const model = getModel()
      const chat = model.startChat({
        systemInstruction: systemInstruction
          ? { role: 'user', parts: [{ text: systemInstruction }] }
          : undefined,
        history: messages.slice(0, -1).map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
      })
      const lastMessage = messages[messages.length - 1]
      const result = await chat.sendMessage(lastMessage.content)
      return result.response.text()
    }),
  )
}
