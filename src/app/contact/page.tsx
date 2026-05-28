import type { Metadata } from 'next'
import Link from 'next/link'
import { QrCode, Phone, Mail, MessageCircle, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with bicres. We help restaurants set up digital QR menus. Call, email or WhatsApp us.',
  alternates: { canonical: 'https://bicres.com/contact' },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">bicres</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-blue-700 text-xs font-bold uppercase tracking-widest mb-3">Get in touch</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Contact Us</h1>
          <p className="text-gray-500 text-base">
            Have questions about bicres? We&apos;d love to help you set up your restaurant&apos;s digital menu.
          </p>
        </div>

        {/* Contact cards */}
        <div className="space-y-4">

          {/* WhatsApp */}
          <a
            href="https://wa.me/916362130218?text=Hi%2C%20I%27m%20interested%20in%20bicres%20QR%20ordering%20for%20my%20restaurant"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-5 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: '#25D366' }}>
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm mb-0.5">WhatsApp</p>
              <p className="text-gray-500 text-sm">+91 63621 30218</p>
              <p className="text-green-600 text-xs font-medium mt-1">Fastest response · usually within minutes</p>
            </div>
            <div className="text-gray-300 group-hover:text-green-500 transition-colors">→</div>
          </a>

          {/* Phone */}
          <a
            href="tel:+916362130218"
            className="flex items-center gap-5 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-800 transition-colors group-hover:scale-105">
              <Phone className="w-6 h-6 text-blue-800 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm mb-0.5">Phone</p>
              <p className="text-gray-500 text-sm">+91 63621 30218</p>
              <p className="text-gray-400 text-xs mt-1">Mon–Sat, 10am – 7pm IST</p>
            </div>
            <div className="text-gray-300 group-hover:text-blue-500 transition-colors">→</div>
          </a>

          {/* Email */}
          <a
            href="mailto:bicresorder@gmail.com"
            className="flex items-center gap-5 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-800 transition-colors group-hover:scale-105">
              <Mail className="w-6 h-6 text-blue-800 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm mb-0.5">Email</p>
              <p className="text-gray-500 text-sm">bicresorder@gmail.com</p>
              <p className="text-gray-400 text-xs mt-1">We reply within 24 hours</p>
            </div>
            <div className="text-gray-300 group-hover:text-blue-500 transition-colors">→</div>
          </a>

        </div>

        {/* CTA */}
        <div className="mt-12 bg-blue-800 rounded-2xl p-8 text-center">
          <h2 className="text-white font-bold text-xl mb-2">Ready to go digital?</h2>
          <p className="text-blue-200 text-sm mb-6">Set up your restaurant&apos;s QR menu in under 2 minutes.</p>
          <Link
            href="/onboard"
            className="inline-flex items-center gap-2 bg-white text-blue-800 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm"
          >
            Register Free →
          </Link>
        </div>

      </div>
    </div>
  )
}
