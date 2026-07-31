'use client'

import { useRef, useState } from 'react'

interface ScreenshotUploaderProps {
  /** The textarea's current value, one URL per line — read on mount and kept
   *  in sync so a successful upload can prepend to it without a full form
   *  re-render or losing whatever the seller already typed. */
  textareaName: string
}

/**
 * File picker that uploads to /api/upload (Vercel Blob) and prepends the
 * resulting URL to the sibling screenshots textarea — the same textarea the
 * "Regenerate screenshot" button and manual paste already write to, so all
 * three input methods compose instead of fighting each other.
 */
export default function ScreenshotUploader({ textareaName }: ScreenshotUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed.')

      const textarea = document.querySelector<HTMLTextAreaElement>(`textarea[name="${textareaName}"]`)
      if (textarea) {
        const existing = textarea.value.split('\n').map(s => s.trim()).filter(Boolean)
        textarea.value = [data.url, ...existing].join('\n')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={busy}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
        style={{ fontSize: 13 }}
      />
      {busy && <span style={{ fontSize: 12, color: 'var(--gf-text-2, #6b6b6b)' }}>Uploading…</span>}
      {error && <span style={{ fontSize: 12, color: 'var(--gf-danger, #c2374a)' }}>{error}</span>}
    </div>
  )
}
