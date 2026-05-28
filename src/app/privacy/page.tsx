import type { Metadata } from 'next'
import Link from 'next/link'
import { QrCode, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for bicres — how we collect, use and protect your data.',
  alternates: { canonical: 'https://bicres.com/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">bicres</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-400 text-sm mb-10">Last updated: May 28, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-600 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">1. Information We Collect</h2>
              <p>We collect the following information when you use bicres:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Restaurant owners:</strong> Name, email address, phone number, restaurant name, and menu content.</li>
                <li><strong>Customers:</strong> No account required. We may collect table session data and order details to process your order.</li>
                <li><strong>Usage data:</strong> Pages visited, device type, and browser information for analytics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provide and improve the bicres platform</li>
                <li>Send account verification and important service emails</li>
                <li>Process and display restaurant orders</li>
                <li>Respond to support requests</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">3. Data Storage & Security</h2>
              <p>Your data is stored securely on Supabase (PostgreSQL) hosted on AWS. We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest. Passwords are hashed and never stored in plain text. We do not sell your data to third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">4. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Supabase</strong> — Database and authentication</li>
                <li><strong>Netlify</strong> — Website hosting</li>
                <li><strong>Resend</strong> — Transactional email delivery</li>
              </ul>
              <p className="mt-2">Each service has its own privacy policy. We only share data necessary for these services to function.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">5. Cookies</h2>
              <p>bicres uses cookies for authentication sessions (to keep you logged in). We do not use advertising or tracking cookies. You can clear cookies via your browser settings, which will log you out of your account.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="mt-2">To exercise these rights, email us at <a href="mailto:bicresorder@gmail.com" className="text-blue-700 hover:underline">bicresorder@gmail.com</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">7. Data Retention</h2>
              <p>We retain your data for as long as your account is active. If you delete your account, your personal data will be removed within 30 days. Order history may be retained for legal compliance for up to 1 year.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">8. Children's Privacy</h2>
              <p>bicres is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us data, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">9. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify registered users of significant changes via email. Continued use of the Service after changes constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">10. Contact</h2>
              <p>For privacy-related questions or data requests, contact us at:<br />
                <a href="mailto:bicresorder@gmail.com" className="text-blue-700 hover:underline">bicresorder@gmail.com</a>
                {' · '}
                <a href="tel:+916362130218" className="text-blue-700 hover:underline">+91 63621 30218</a>
              </p>
            </section>

          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <Link href="/terms" className="text-blue-700 hover:underline">Terms of Service</Link>
          {' · '}
          <Link href="/contact" className="text-blue-700 hover:underline">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
