import { ShieldCheck, CreditCard, Clock, RotateCcw } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, label: 'Every listing reviewed before it goes live' },
  { icon: CreditCard,  label: 'Payments handled by Stripe' },
  { icon: Clock,       label: 'Most tools install in under a day' },
  { icon: RotateCcw,   label: '7-day refund window' },
]

/**
 * Replaces the old auto-scrolling marquee.
 *
 * A marquee moves text out of reach before it can be read and is a known
 * accessibility problem (no pause control, motion regardless of user
 * preference). These are the same four claims, stated once and readable.
 */
export default function TrustStrip() {
  return (
    <div className="gf-band">
      <div className="gf-trust">
        {ITEMS.map(({ icon: Icon, label }) => (
          <span key={label} className="gf-trust-item" style={{ fontSize: 14, fontWeight: 500, color: 'var(--gf-text-2)' }}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--gf-amber-ink)' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
