/**
 * Instagram Source Adapter
 * 
 * IMPORTANT LIMITATIONS:
 * Instagram's private API requires authentication and violates their ToS if used
 * without authorization. Instagram's Graph API requires an approved app and
 * business/creator account access.
 * 
 * This adapter uses:
 * 1. Instagram's oEmbed API (publicly available for posts, NOT profiles)
 * 2. Open Graph meta tags from public profile pages (limited)
 * 3. Instagram Basic Display API (requires OAuth — user must authorize)
 * 
 * For demo purposes, public OG tags are attempted first. If unavailable,
 * the user is instructed to connect their Instagram account via OAuth.
 */

import { extractInstagramUsername } from '../url-validation'

export interface InstagramPost {
  id: string
  caption?: string
  mediaType: string
  timestamp?: string
  url?: string
}

export interface InstagramData {
  username: string
  profileUrl: string
  displayName?: string
  bio?: string
  isVerified?: boolean
  followerCount?: number
  followingCount?: number
  postCount?: number
  recentCaptions?: string[]
  hashtags?: string[]
  source: 'og_tags' | 'basic_api' | 'manual_import' | 'unavailable'
  error?: string
}

export type InstagramStatus = 'success' | 'partial' | 'failed' | 'manual_required'

export interface InstagramResult {
  status: InstagramStatus
  data: InstagramData | null
  message: string
}

/**
 * Extract hashtags from Instagram captions
 */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || []
  return [...new Set(matches.map((h) => h.toLowerCase()))]
}

/**
 * Attempt to retrieve public Open Graph data from an Instagram profile
 */
async function fetchInstagramOpenGraph(username: string): Promise<InstagramData | null> {
  try {
    const profileUrl = `https://www.instagram.com/${username}/`
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

    if (!response.ok) return null

    const html = await response.text()

    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
    const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]

    if (!ogTitle && !ogDescription) return null

    // Instagram OG title format: "Name (@username) • Instagram"
    const nameMatch = ogTitle?.match(/^(.+?)\s*\(@/)
    const displayName = nameMatch?.[1]?.trim() || ogTitle?.replace('• Instagram', '').trim()

    // OG description contains follower/following counts and bio snippet
    const followerMatch = ogDescription?.match(/(\d[\d,.]*)\s*Followers/)
    const followingMatch = ogDescription?.match(/(\d[\d,.]*)\s*Following/)
    const postMatch = ogDescription?.match(/(\d[\d,.]*)\s*Posts/)

    return {
      username,
      profileUrl,
      displayName,
      bio: ogDescription,
      followerCount: followerMatch
        ? parseInt(followerMatch[1].replace(/[^0-9]/g, ''))
        : undefined,
      followingCount: followingMatch
        ? parseInt(followingMatch[1].replace(/[^0-9]/g, ''))
        : undefined,
      postCount: postMatch ? parseInt(postMatch[1].replace(/[^0-9]/g, '')) : undefined,
      source: 'og_tags',
    }
  } catch {
    return null
  }
}

export async function fetchInstagramProfile(instagramUrl: string): Promise<InstagramResult> {
  const username = extractInstagramUsername(instagramUrl)
  if (!username) {
    return {
      status: 'failed',
      data: null,
      message: 'Invalid Instagram URL format',
    }
  }

  const ogData = await fetchInstagramOpenGraph(username)

  if (ogData && (ogData.displayName || ogData.bio)) {
    const hashtags = ogData.bio ? extractHashtags(ogData.bio) : []
    return {
      status: 'partial',
      data: { ...ogData, hashtags },
      message:
        'Retrieved limited public data via Open Graph tags. Instagram restricts full profile access. Bio, follower counts, and hashtags from the bio are available. Post captions require Instagram Basic Display API authorization.',
    }
  }

  return {
    status: 'manual_required',
    data: {
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
      source: 'unavailable',
      error:
        'Instagram profile could not be retrieved automatically. The platform restricts automated access.',
    },
    message:
      'Instagram profile could not be retrieved automatically. Instagram heavily restricts public data access. Options: (1) The user can manually provide their bio, interests, and recent post themes. (2) Connect Instagram via Basic Display API OAuth (requires app approval from Meta). Analysis will proceed with available data only.',
  }
}

/**
 * Parse manually imported Instagram data (from Instagram's "Download Your Data")
 */
export function parseInstagramExport(
  exportData: Record<string, unknown>,
): Partial<InstagramData> {
  try {
    const captions: string[] = []
    const mediaList = (exportData as {media?: Array<{title?: string}>}).media || []
    for (const item of mediaList) {
      if (item.title) captions.push(item.title)
    }

    const allHashtags = captions.flatMap(extractHashtags)
    const uniqueHashtags = [...new Set(allHashtags)]

    return {
      bio: (exportData as {biography?: string}).biography,
      recentCaptions: captions.slice(0, 20),
      hashtags: uniqueHashtags,
      source: 'manual_import',
    }
  } catch {
    return { source: 'manual_import' }
  }
}
