/**
 * LinkedIn Source Adapter
 * 
 * IMPORTANT LIMITATIONS:
 * LinkedIn does not provide a public API for profile data retrieval.
 * Direct scraping violates LinkedIn's User Agreement (Section 8.2).
 * 
 * This adapter uses the following permitted approaches:
 * 1. LinkedIn's official oEmbed endpoint for public posts (where available)
 * 2. Open Graph meta tags from publicly accessible profile pages
 * 3. Manual import: users can paste their own exported LinkedIn data
 * 
 * If retrieval fails, the adapter returns a clear explanation and
 * allows the user to manually import their LinkedIn data export.
 */

import { extractLinkedInUsername } from '../url-validation'

export interface LinkedInData {
  username: string
  profileUrl: string
  name?: string
  headline?: string
  about?: string
  skills?: string[]
  source: 'og_tags' | 'manual_import' | 'unavailable'
  rawHtml?: string
  error?: string
}

export type LinkedInStatus = 'success' | 'partial' | 'failed' | 'manual_required'

export interface LinkedInResult {
  status: LinkedInStatus
  data: LinkedInData | null
  message: string
}

/**
 * Attempt to retrieve publicly accessible Open Graph tags from a LinkedIn profile.
 * LinkedIn heavily restricts bot access, so this often returns limited data.
 */
async function fetchLinkedInOpenGraph(profileUrl: string, username: string): Promise<LinkedInData | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PairwiseAI/1.0; +https://pairwise.ai/bot)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return null
    }

    const html = await response.text()

    // Extract Open Graph meta tags
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
    const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]

    // LinkedIn typically shows very limited public data without login
    if (!ogTitle && !ogDescription) return null

    return {
      username,
      profileUrl,
      name: ogTitle?.replace(' | LinkedIn', '').trim(),
      about: ogDescription,
      source: 'og_tags',
    }
  } catch {
    return null
  }
}

export async function fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInResult> {
  const username = extractLinkedInUsername(linkedinUrl)
  if (!username) {
    return {
      status: 'failed',
      data: null,
      message: 'Invalid LinkedIn URL format',
    }
  }

  const profileUrl = `https://www.linkedin.com/in/${username}/`

  // Attempt Open Graph retrieval
  const ogData = await fetchLinkedInOpenGraph(profileUrl, username)

  if (ogData && ogData.name) {
    return {
      status: 'partial',
      data: ogData,
      message:
        'Retrieved limited public data via Open Graph tags. LinkedIn restricts full profile access without login. For richer analysis, the person can import their LinkedIn data export (Settings → Data Privacy → Get a copy of your data).',
    }
  }

  return {
    status: 'manual_required',
    data: {
      username,
      profileUrl,
      source: 'unavailable',
      error:
        'LinkedIn requires authentication to view full profiles. The platform blocks automated access as per their Terms of Service.',
    },
    message:
      'LinkedIn profile could not be retrieved automatically. This is expected behavior — LinkedIn requires login to view profiles and restricts automated access. To enable analysis: (1) The person can export their LinkedIn data from Settings → Data Privacy → Get a copy of your data, then upload it here. (2) Alternatively, analysis will proceed using Instagram data only.',
  }
}

/**
 * Parse manually imported LinkedIn data export (JSON format from LinkedIn's export)
 */
export function parseLinkedInExport(exportData: Record<string, unknown>): Partial<LinkedInData> {
  try {
    return {
      name: (exportData.firstName as string || '') + ' ' + (exportData.lastName as string || ''),
      headline: exportData.headline as string,
      about: exportData.summary as string,
      skills: Array.isArray(exportData.skills)
        ? (exportData.skills as Array<{name: string}>).map((s) => s.name)
        : [],
      source: 'manual_import',
    }
  } catch {
    return { source: 'manual_import' }
  }
}
