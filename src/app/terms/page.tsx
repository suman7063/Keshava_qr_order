import type { Metadata } from 'next'
import Link from 'next/link'
import { QrCode, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for bicres — QR ordering platform for restaurants.',
  alternates: { canonical: 'https://bicres.com/terms' },
}

export default function TermsPage() {
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

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-400 text-sm mb-10">Last updated: May 28, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-600 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using bicres.com ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all restaurant owners, managers, and end users (customers) who interact with the platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">2. Description of Service</h2>
              <p>bicres provides a QR-based digital menu and ordering platform for restaurants. Restaurant owners can register, create menus, generate QR codes, and manage orders. Customers can scan QR codes to view menus and place orders from their mobile devices.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">3. Account Registration</h2>
              <p>Restaurant owners must register with a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration. Each restaurant gets a unique URL (e.g., bicres.com/yourname).</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">4. Plans & Payment</h2>
              <p>bicres offers a free Starter plan and a paid Pro plan (₹499/month). Paid plans are billed monthly. You may cancel at any time. No refunds are provided for the current billing period. We reserve the right to change pricing with 30 days' notice.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">5. Acceptable Use</h2>
              <p>You agree not to misuse the Service. Prohibited activities include: uploading illegal content, attempting to hack or disrupt the platform, creating fake restaurant listings, or using the platform for any unlawful purpose.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">6. Intellectual Property</h2>
              <p>All content on bicres.com, including logos, design, and software, is owned by bicres. Menu content uploaded by restaurant owners remains their property. By uploading content, you grant bicres a license to display it on the platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
              <p>bicres is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from the use of our Service, including loss of orders, revenue, or data.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">8. Termination</h2>
              <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting us at bicresorder@gmail.com.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">9. Changes to Terms</h2>
              <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify registered users of significant changes via email.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">10. Contact</h2>
              <p>For questions about these Terms, contact us at: <a href="mailto:bicresorder@gmail.com" className="text-blue-700 hover:underline">bicresorder@gmail.com</a> or <a href="tel:+916362130218" className="text-blue-700 hover:underline">+91 63621 30218</a>.</p>
            </section>

          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <Link href="/privacy" className="text-blue-700 hover:underline">Privacy Policy</Link>
          {' · '}
          <Link href="/contact" className="text-blue-700 hover:underline">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
