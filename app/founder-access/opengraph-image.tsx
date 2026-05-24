import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Founder Access on SquishyMind — half-price Premium, forever.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background:
            'linear-gradient(135deg, #1a0b2e 0%, #2a1a3e 50%, #0a1a2a 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -150,
            right: -150,
            width: 600,
            height: 600,
            background:
              'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 65%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            left: -200,
            width: 600,
            height: 600,
            background:
              'radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, transparent 65%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 28,
            color: '#fcd34d',
            marginBottom: 20,
            zIndex: 1,
          }}
        >
          <span
            style={{
              padding: '4px 14px',
              borderRadius: 999,
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              display: 'flex',
            }}
          >
            ★ Founder Access · Beta exclusive
          </span>
        </div>

        <div
          style={{
            fontSize: 78,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            background:
              'linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            zIndex: 1,
          }}
        >
          Half price. Forever.
        </div>

        <div
          style={{
            fontSize: 32,
            color: '#e8e6f0',
            fontWeight: 500,
            marginTop: 28,
            lineHeight: 1.3,
            maxWidth: 940,
            zIndex: 1,
          }}
        >
          Every beta signup locks in $1.99/mo (or $14.99/yr) for as long as
          you stay subscribed. Bigger free tier too.
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            right: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 22,
            color: '#c1bbd5',
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 28, display: 'flex' }}>🧠</div>
          squishymind.com/founder-access
        </div>
      </div>
    ),
    { ...size },
  );
}
