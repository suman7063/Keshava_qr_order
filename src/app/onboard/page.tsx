import type { Metadata } from 'next'
import OnboardClient from './OnboardClient'

export const metadata: Metadata = {
  title: 'Register Your Restaurant — Free QR Menu Setup',
  description:
    'Set up your restaurant\'s digital QR menu in under 2 minutes. Add menu items, generate QR codes for tables, and start accepting orders instantly. Free plan available.',
  alternates: { canonical: 'https://bicres.com/onboard' },
  openGraph: {
    title: 'Register Your Restaurant — Free QR Menu Setup',
    description:
      'Set up your restaurant\'s digital QR menu in under 2 minutes. Add menu items, generate QR codes for tables, and start accepting orders instantly.',
    url: 'https://bicres.com/onboard',
    type: 'website',
    siteName: 'bicres',
  },
}

export default function OnboardPage() {
  return <OnboardClient />
}
