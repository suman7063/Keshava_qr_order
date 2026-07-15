import { ImageResponse } from 'next/og'
import { createPublicClient } from '@/lib/supabase/public'

// ISR: same cadence as the restaurant page itself.
export const revalidate = 300

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('restaurants')
    .select('name')
    .eq('subdomain', slug)
    .eq('status', 'active')
    .single()

  const name = data?.name ?? slug

  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 22,
          letterSpacing: 6,
          textTransform: 'uppercase',
          marginBottom: 28,
          fontWeight: 500,
        }}>
          Digital Menu
        </div>

        <div style={{
          color: 'white',
          fontSize: name.length > 24 ? 56 : name.length > 16 ? 72 : 92,
          fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '-2px',
          marginBottom: 28,
          lineHeight: 1.1,
        }}>
          {name}
        </div>

        <div style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 28,
          fontWeight: 400,
        }}>
          Scan QR at your table to order
        </div>

        <div style={{
          position: 'absolute',
          bottom: 48,
          color: 'rgba(255,255,255,0.3)',
          fontSize: 20,
        }}>
          Powered by bicres.com
        </div>
      </div>
    ),
    { ...size }
  )
}
