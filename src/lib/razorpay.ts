import Razorpay from 'razorpay'

/** Pro plan id — accept either env var name. */
export function proPlanId(): string | undefined {
  return process.env.RAZORPAY_PLAN_ID_PRO || process.env.RAZORPAY_PLAN_ID
}

export function razorpayConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    proPlanId()
  )
}

export function createRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}
