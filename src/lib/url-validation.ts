/**
 * URL Validation Utilities for Pairwise AI
 * Validates LinkedIn and Instagram public profile URLs.
 */

export interface UrlValidationResult {
  valid: boolean
  error?: string
  normalized?: string
}

export function validateLinkedInUrl(url: string): UrlValidationResult {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'LinkedIn URL is required' }
  }

  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  if (!['linkedin.com', 'www.linkedin.com'].includes(parsed.hostname)) {
    return { valid: false, error: 'URL must be from linkedin.com' }
  }

  // Must match /in/username pattern
  const match = parsed.pathname.match(/^\/in\/([a-zA-Z0-9\-_%]+)\/?$/)
  if (!match) {
    return {
      valid: false,
      error: 'URL must be a LinkedIn profile URL in the format: linkedin.com/in/username',
    }
  }

  const normalized = `https://www.linkedin.com/in/${match[1]}/`
  return { valid: true, normalized }
}

export function validateInstagramUrl(url: string): UrlValidationResult {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'Instagram URL is required' }
  }

  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  if (!['instagram.com', 'www.instagram.com'].includes(parsed.hostname)) {
    return { valid: false, error: 'URL must be from instagram.com' }
  }

  // Must match /username pattern (not /p/, /reel/, /explore/, etc.)
  const match = parsed.pathname.match(/^\/([a-zA-Z0-9_.]+)\/?$/)
  if (!match) {
    return {
      valid: false,
      error: 'URL must be an Instagram profile URL in the format: instagram.com/username',
    }
  }

  const reserved = ['p', 'reel', 'reels', 'explore', 'accounts', 'direct', 'tv', 'stories']
  if (reserved.includes(match[1].toLowerCase())) {
    return { valid: false, error: 'URL must point to a user profile, not a post or reel' }
  }

  const normalized = `https://www.instagram.com/${match[1]}/`
  return { valid: true, normalized }
}

export function extractLinkedInUsername(url: string): string | null {
  const result = validateLinkedInUrl(url)
  if (!result.valid || !result.normalized) return null
  const match = result.normalized.match(/\/in\/([^/]+)\//)
  return match ? match[1] : null
}

export function extractInstagramUsername(url: string): string | null {
  const result = validateInstagramUrl(url)
  if (!result.valid || !result.normalized) return null
  const match = result.normalized.match(/instagram\.com\/([^/]+)\//)
  return match ? match[1] : null
}
