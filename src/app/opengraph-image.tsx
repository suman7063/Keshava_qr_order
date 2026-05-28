import { ImageResponse } from 'next/og'

export const alt = 'bicres — QR Ordering Platform for Restaurants'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Logo mark */}
        <div style={{
          width: 88,
          height: 88,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
          border: '1.5px solid rgba(255,255,255,0.22)',
        }}>
          <div style={{ color: 'white', fontSize: 42, lineHeight: 1 }}>⬛</div>
        </div>

        {/* Brand name */}
        <div style={{
          color: 'white',
          fontSize: 108,
          fontWeight: 800,
          letterSpacing: '-4px',
          marginBottom: 18,
          lineHeight: 1,
        }}>
          bicres
        </div>

        {/* Tagline */}
        <div style={{
          color: 'rgba(255,255,255,0.72)',
          fontSize: 34,
          fontWeight: 400,
          textAlign: 'center',
          marginBottom: 0,
        }}>
          QR Ordering Platform for Restaurants
        </div>

        {/* Bottom pills */}
        <div style={{
          position: 'absolute',
          bottom: 56,
          display: 'flex',
          gap: 24,
          alignItems: 'center',
        }}>
          {['Scan QR', 'Browse Menu', 'Order Instantly'].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 22,
                fontWeight: 400,
              }}>{text}</div>
              {i < 2 && <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 22 }}>·</div>}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
