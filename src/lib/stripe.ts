import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Lazy-initialized Stripe client. Avoids build-time errors when
 * STRIPE_SECRET_KEY is not available (e.g., during next build).
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    })
  }
  return _stripe
}

export const PLANS = {
  pro: {
    name: 'Pro',
    credits: 50,
    get stripe_price_id() {
      return process.env.STRIPE_PRO_PRICE_ID || ''
    },
  },
  business: {
    name: 'Business',
    credits: 200,
    get stripe_price_id() {
      return process.env.STRIPE_BUSINESS_PRICE_ID || ''
    },
  },
} as const
