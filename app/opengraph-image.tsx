import { ImageResponse } from 'next/og';

// Default OG image for the whole site. Next auto-detects this file and
// serves the rendered PNG at /opengraph-image. Per-route overrides live
// next to their own page (e.g. app/pricing/opengraph-image.tsx).
//
// ImageResponse uses a satori-based JSX-to-SVG-to-PNG pipeline. Only a
// limited subset of CSS works — keep it to flex layouts and simple
// gradients. No animations, no transitions, no @media.

export const runtime = 'edge';
export const alt = 'SquishyMind — your brain, but squishier.';
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
        {/* Pink glow top-left */}
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
        {/* Cyan glow bottom-right */}
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
        {/* Violet wash middle */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            right: 80,
            width: 400,
            height: 400,
            background:
              'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Inline brain — a simplified version of the brain.svg path. Keeping
            the original 199KB SVG out of the OG generation pipeline (satori
            doesn't love arbitrary paths anyway). */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            marginBottom: 36,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 120,
              lineHeight: 1,
              filter: 'drop-shadow(0 8px 32px rgba(236, 72, 153, 0.5))',
              display: 'flex',
            }}
          >
            🧠
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background:
                'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}
          >
            SquishyMind
          </div>
        </div>

        <div
          style={{
            fontSize: 44,
            color: '#e8e6f0',
            fontWeight: 500,
            lineHeight: 1.2,
            zIndex: 1,
          }}
        >
          Your brain, but squishier.
        </div>

        <div
          style={{
            fontSize: 26,
            color: '#9ca3af',
            marginTop: 24,
            lineHeight: 1.4,
            maxWidth: 880,
            zIndex: 1,
          }}
        >
          A wobbly, lovely, infinite mind-mapping canvas with a sentient pink
          brain in the corner. Free during beta.
        </div>

        {/* Bottom-right brand chip — gives the card a clean visual anchor */}
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
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ec4899',
              boxShadow: '0 0 16px rgba(236, 72, 153, 0.8)',
              display: 'flex',
            }}
          />
          squishymind.com
        </div>
      </div>
    ),
    { ...size },
  );
}
