import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SquishyMind pricing — Founder Access from $1.99/mo';
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
            'linear-gradient(135deg, #0a0b16 0%, #1a0b2e 45%, #0a1a2a 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 600,
            height: 600,
            background:
              'radial-gradient(circle, rgba(236, 72, 153, 0.45) 0%, transparent 65%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -200,
            width: 600,
            height: 600,
            background:
              'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, transparent 65%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 28,
            color: '#a5f3fc',
            marginBottom: 20,
            zIndex: 1,
          }}
        >
          <span
            style={{
              padding: '4px 14px',
              borderRadius: 999,
              background: 'rgba(6, 182, 212, 0.18)',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              display: 'flex',
            }}
          >
            Pricing
          </span>
        </div>

        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            background:
              'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            zIndex: 1,
          }}
        >
          Founder Access
        </div>

        <div
          style={{
            fontSize: 56,
            color: '#e8e6f0',
            fontWeight: 600,
            marginTop: 20,
            lineHeight: 1.1,
            zIndex: 1,
          }}
        >
          $1.99/month, forever.
        </div>

        <div
          style={{
            fontSize: 26,
            color: '#9ca3af',
            marginTop: 28,
            lineHeight: 1.4,
            maxWidth: 880,
            zIndex: 1,
          }}
        >
          Sign up during beta and lock in half-price Premium for life.
          Three tiers. No "free forever" fairy tales.
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
          squishymind.com
        </div>
      </div>
    ),
    { ...size },
  );
}
