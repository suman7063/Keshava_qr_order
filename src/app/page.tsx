import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-red-50 flex flex-col items-center justify-center p-6">

      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-linear-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-200">
          <UtensilsCrossed className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-3">QR Kitchen</h1>
        <p className="text-gray-400 text-base">Restaurant Ordering System</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/admin/login"
          className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-lg shadow-orange-200 transition-all hover:scale-105"
        >
          Admin Login
        </Link>
        <Link
          href="/manager/login"
          className="flex-1 text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-lg shadow-purple-200 transition-all hover:scale-105"
        >
          Manager Login
        </Link>
      </div>

      <p className="mt-12 text-xs text-gray-300">Powered by QR Kitchen &copy; 2026</p>
    </div>
  )
}
