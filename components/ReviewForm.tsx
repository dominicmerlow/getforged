'use client'
import { useActionState, useState } from 'react'
import { submitReview, type ReviewState } from '@/app/actions/reviews'

interface ReviewFormProps {
  productId: string
  productSlug: string
}

export default function ReviewForm({ productId, productSlug }: ReviewFormProps) {
  const [state, formAction, isPending] = useActionState<ReviewState, FormData>(submitReview, null)
  const [selectedRating, setSelectedRating] = useState(0)

  if (state && 'ok' in state && state.ok) {
    return (
      <div
        style={{
          border: '1px solid #22c55e',
          borderRadius: 4,
          padding: '16px 20px',
          color: '#15803d',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
        }}
      >
        Thanks for your review!
      </div>
    )
  }

  return (
    <form action={formAction} style={{ display: 'grid', gap: 16 }}>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="slug" value={productSlug} />

      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b6b6b',
            marginBottom: 8,
          }}
        >
          Rating
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <label key={n} style={{ cursor: 'pointer', fontSize: 28, color: selectedRating >= n ? '#b97314' : '#ccc' }}>
              <input
                type="radio"
                name="rating"
                value={n}
                style={{ display: 'none' }}
                onChange={() => setSelectedRating(n)}
                required
              />
              ★
            </label>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b6b6b',
            marginBottom: 8,
          }}
        >
          Review (optional)
        </div>
        <textarea
          name="body"
          placeholder="Share your experience..."
          rows={4}
          maxLength={1000}
          style={{
            width: '100%',
            fontFamily: 'var(--font-serif)',
            fontSize: 16,
            lineHeight: 1.5,
            padding: '10px 14px',
            border: '1px solid rgba(42,39,32,0.2)',
            background: 'var(--paper, #fafaf5)',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {state && 'error' in state && (
        <div
          style={{
            border: '1px solid #b97314',
            borderRadius: 4,
            padding: '12px 16px',
            color: '#92400e',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            background: '#fffbeb',
          }}
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || selectedRating === 0}
        className="btn-hero-primary"
        style={{
          cursor: isPending || selectedRating === 0 ? 'not-allowed' : 'pointer',
          opacity: isPending || selectedRating === 0 ? 0.6 : 1,
          border: 'none',
          alignSelf: 'start',
        }}
      >
        {isPending ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}
