'use client'

import { adminRefundPurchase } from '@/app/admin/actions'

export default function RefundButton({ purchaseId }: { purchaseId: string }) {
  return (
    <form action={adminRefundPurchase}>
      <input type="hidden" name="purchase_id" value={purchaseId} />
      <button
        type="submit"
        className="btn btn-ghost-new btn-sm"
        onClick={e => {
          if (!confirm('Refund this purchase in full via Stripe?')) e.preventDefault()
        }}
      >
        Refund
      </button>
    </form>
  )
}
