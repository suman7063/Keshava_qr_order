import type { Metadata } from 'next'
import Script from 'next/script'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'bicres — QR Ordering Platform for Restaurants',
  description:
    'Register your restaurant, add your menu, print QR cards and go live in under 2 minutes. Customers scan and order from their phone — kitchen notified instantly. Free plan available.',
  alternates: { canonical: 'https://bicres.com' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'bicres',
      url: 'https://bicres.com',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'QR-based digital menu and ordering platform for restaurants. Customers scan table QR codes to browse the menu and place orders. Kitchen gets real-time notifications.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        description: 'Free plan available',
      },
      featureList: [
        'Digital QR Menu',
        'Kitchen Display System',
        'Manager Dashboard',
        'PDF Menu Export',
        'QR Card Templates',
        'Table Session Management',
      ],
    },
    {
      '@type': 'Organization',
      name: 'bicres',
      url: 'https://bicres.com',
      logo: 'https://bicres.com/logo.png',
      sameAs: [],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does bicres QR ordering work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Restaurant owners register on bicres, add their menu items with photos and prices, generate QR codes for each table, and print them. Customers scan the QR code at their table, browse the digital menu, and place orders directly from their phone — no app download needed. The kitchen receives orders instantly on their display screen.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is bicres free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, bicres offers a free Starter plan that includes up to 10 tables, a digital QR menu, and QR code downloads. The Pro plan at ₹999/month includes unlimited tables, kitchen display, manager dashboard, and PDF menu export.',
          },
        },
        {
          '@type': 'Question',
          name: 'How quickly can I set up my restaurant on bicres?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can register your restaurant, add your menu, and start accepting QR orders in under 2 minutes. Simply sign up, add your menu items, generate QR codes for your tables, and print them.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do customers need to download an app to order?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Customers simply scan the QR code at their table using their phone camera. The menu opens directly in their browser — no app download required.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the URL for my restaurant menu?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Each restaurant gets a unique URL like bicres.com/yourname. You can share this URL on posters, WhatsApp, and social media, or embed it in QR codes for each table.',
          },
        },
      ],
    },
  ],
}

export default function Home() {
  return (
    <>
      <Script
        id="json-ld-home"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient restaurant={null} />
    </>
  )
}
