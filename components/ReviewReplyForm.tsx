'use client'

import { useActionState, useState } from 'react'
import { replyToReview, type ReplyState } from '@/app/actions/reviews'
import { track } from '@/lib/analytics'

interface Props {
  reviewId: string
  productSlug: string
  /** Existing reply (if any) — pre-fills the textarea so editing is in place */
  existingReply?: string | null
}

export default function ReviewReplyForm({ reviewId, productSlug, existingReply }: Props) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToReview, null)
  const [isEditing, setIsEditing] = useState(!existingReply)
  const [body, setBody] = useState(existingReply ?? '')
  const ok = state && 'ok' in state

  // After a successful save, collapse the form back to read-only display
  if (ok && !isEditing) {
    return null
  }

  // Read-only mode (existing reply present, not editing) is rendered by
  // the parent — we only show the form when editing
  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--soft-amber, #b97314)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textDecoration: 'underline',
        }}
      >
        Edit reply
      </button>
    )
  }

  return (
    <form
      action={async fd => {
        await action(fd)
        track('review_reply_posted', {
          review_id: reviewId,
          length: body.length,
          is_edit: !!existingReply,
        })
        if (body.trim().length > 0) setIsEditing(false)
      }}
      style={{ display: 'grid', gap: 8, marginTop: 12, padding: 12, background: 'rgba(185,115,20,0.06)', borderLeft: '3px solid var(--soft-amber, #b97314)' }}
    >
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="slug" value={productSlug} />
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--soft-amber, #b97314)',
      }}>
        Builder reply
      </div>
      <textarea
        name="body"
        rows={3}
        value={body}
        onChange={e => setBody(e.target.value)}
        maxLength={1500}
        placeholder="Thanks for the feedback — here's what we're doing about it…"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          padding: '10px 12px',
          border: '1px solid var(--ink, #2a2217)',
          background: 'var(--paper, #fafaf5)',
          color: 'var(--ink, #2a2217)',
          outline: 'none',
          resize: 'vertical',
          minHeight: 70,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={pending}
          className="btn-amber"
          style={{
            padding: '8px 14px',
            fontSize: 12,
            cursor: pending ? 'wait' : 'pointer',
            border: 'none',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? 'Posting…' : existingReply ? 'Update reply' : 'Post reply'}
        </button>
        {existingReply && (
          <button
            type="button"
            onClick={() => {
              setBody('')
              const form = document.createElement('form')
              const fd = new FormData()
              fd.set('review_id', reviewId)
              fd.set('slug', productSlug)
              fd.set('body', '')
              void action(fd)
            }}
            disabled={pending}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid var(--ink, #2a2217)',
              color: 'var(--ink, #2a2217)',
            }}
          >
            Clear reply
          </button>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b6b6b' }}>
          {body.length}/1500
        </span>
        {state && 'error' in state && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c87d1a' }}>
            {state.error}
          </span>
        )}
      </div>
    </form>
  )
}
