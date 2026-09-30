'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Linkedin, Instagram, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { validateLinkedInUrl, validateInstagramUrl } from '@/lib/url-validation'

export default function AddPersonPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', linkedinUrl: '', instagramUrl: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  function validate(): boolean {
    const errs: Record<string, string> = {}

    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters'
    }

    if (!form.linkedinUrl && !form.instagramUrl) {
      errs.general = 'At least one of LinkedIn URL or Instagram URL is required'
    }

    if (form.linkedinUrl) {
      const res = validateLinkedInUrl(form.linkedinUrl)
      if (!res.valid) errs.linkedinUrl = res.error!
    }

    if (form.instagramUrl) {
      const res = validateInstagramUrl(form.instagramUrl)
      if (!res.valid) errs.instagramUrl = res.error!
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: `${form.name} added successfully!` })
        setTimeout(() => router.push(`/dashboard/people/${data.person.id}`), 1500)
      } else {
        setResult({ success: false, message: data.error || 'Failed to add person' })
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  function getUrlPreview(url: string, type: 'linkedin' | 'instagram') {
    const validator = type === 'linkedin' ? validateLinkedInUrl : validateInstagramUrl
    const result = validator(url)
    if (result.valid) return { ok: true, value: result.normalized! }
    if (url && !result.valid) return { ok: false, value: result.error! }
    return null
  }

  const linkedinPreview = form.linkedinUrl ? getUrlPreview(form.linkedinUrl, 'linkedin') : null
  const instagramPreview = form.instagramUrl ? getUrlPreview(form.instagramUrl, 'instagram') : null

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/people" className="btn-ghost text-sm mb-4 inline-flex">
          <ArrowLeft className="w-4 h-4" />
          Back to People
        </Link>
        <h1 className="text-3xl text-display text-[#1a1612] mb-2">Add a Person</h1>
        <p className="text-[#8a7d6e] text-sm">
          Enter the person&apos;s public LinkedIn and/or Instagram profile URLs. We&apos;ll
          attempt to retrieve publicly available data. Both URLs are optional but at least one
          is required for meaningful analysis.
        </p>
      </div>

      {/* Info notice */}
      <div className="bg-[#f5ede0] border border-[#dcc9aa] rounded-xl px-4 py-3 mb-6 text-sm text-[#8a6040]">
        <strong>Important:</strong> LinkedIn and Instagram restrict automated data access. We use only
        publicly available Open Graph tags. Full profile data requires manual import or platform API access.
        Analysis quality depends on available public data.
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="label">Full Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Jane Smith"
            className={`input ${errors.name ? 'border-[#e85d4a] focus:border-[#e85d4a]' : ''}`}
          />
          {errors.name && (
            <p className="text-xs text-[#e85d4a] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* LinkedIn URL */}
        <div>
          <label className="label flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0077b5]" />
            LinkedIn Profile URL
          </label>
          <input
            type="url"
            value={form.linkedinUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            placeholder="https://www.linkedin.com/in/username"
            className={`input ${errors.linkedinUrl ? 'border-[#e85d4a]' : ''}`}
          />
          {linkedinPreview && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${linkedinPreview.ok ? 'text-[#4a7a6a]' : 'text-[#e85d4a]'}`}>
              {linkedinPreview.ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {linkedinPreview.value}
            </p>
          )}
          {errors.linkedinUrl && !linkedinPreview && (
            <p className="text-xs text-[#e85d4a] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.linkedinUrl}
            </p>
          )}
        </div>

        {/* Instagram URL */}
        <div>
          <label className="label flex items-center gap-2">
            <Instagram className="w-4 h-4 text-[#e1306c]" />
            Instagram Profile URL
          </label>
          <input
            type="url"
            value={form.instagramUrl}
            onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
            placeholder="https://www.instagram.com/username"
            className={`input ${errors.instagramUrl ? 'border-[#e85d4a]' : ''}`}
          />
          {instagramPreview && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${instagramPreview.ok ? 'text-[#4a7a6a]' : 'text-[#e85d4a]'}`}>
              {instagramPreview.ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {instagramPreview.value}
            </p>
          )}
          {errors.instagramUrl && !instagramPreview && (
            <p className="text-xs text-[#e85d4a] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.instagramUrl}
            </p>
          )}
        </div>

        {errors.general && (
          <div className="bg-[#fde8e5] border border-[#f0806f] rounded-xl px-4 py-3 text-sm text-[#c94535] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.general}
          </div>
        )}

        {result && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            result.success ? 'bg-[#e8f0ed] text-[#4a7a6a]' : 'bg-[#fde8e5] text-[#c94535]'
          }`}>
            {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {result.message}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding…
              </>
            ) : (
              'Add Person'
            )}
          </button>
          <Link href="/dashboard/people" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>

      {/* Limitations notice */}
      <div className="mt-6 card p-4">
        <h3 className="font-semibold text-sm text-[#1a1612] mb-3">Data Retrieval Limitations</h3>
        <div className="space-y-2 text-xs text-[#8a7d6e]">
          <div className="flex items-start gap-2">
            <Linkedin className="w-3.5 h-3.5 text-[#0077b5] flex-shrink-0 mt-0.5" />
            <span><strong>LinkedIn:</strong> Requires login to view full profiles. We retrieve only public Open Graph data (name, headline if visible). For richer data, the person can export their LinkedIn data and upload it manually.</span>
          </div>
          <div className="flex items-start gap-2">
            <Instagram className="w-3.5 h-3.5 text-[#e1306c] flex-shrink-0 mt-0.5" />
            <span><strong>Instagram:</strong> Public profiles expose limited Open Graph data (display name, bio, follower counts). Full post data requires Instagram Basic Display API authorization from the account holder.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
