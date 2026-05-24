import { ImageResponse } from 'next/og';
import { shipped } from '@/lib/changelog-data';

export const runtime = 'edge';
export const alt = "What's new in SquishyMind";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Dynamic — embeds the most recent shipped version + title so the social
// preview always reflects what's actually new. Regenerates whenever
// lib/changelog-data.ts ships an update.
export default async function OG() {
  const latest = shipped[0];

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
            top: -150,
            left: -200,
            width: 600,
            height: 600,
            background:
              'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 65%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -150,
            width: 600,
            height: 600,
            background:
              'radial-gradient(circle, rgba(6, 182, 212, 0.32) 0%, transparent 65%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 26,
            marginBottom: 24,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#ec4899',
              boxShadow: '0 0 16px rgba(236, 72, 153, 0.8)',
              display: 'flex',
            }}
          />
          <span style={{ color: '#fbcfe8' }}>Just shipped · {latest.version}</span>
        </div>

        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            background:
              'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            zIndex: 1,
            maxWidth: 1040,
          }}
        >
          {latest.title}
        </div>

        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            marginTop: 36,
            lineHeight: 1.4,
            maxWidth: 980,
            zIndex: 1,
          }}
        >
          The SquishyMind changelog — what we shipped this week, last week,
          and the week before that.
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
          squishymind.com/changelog
        </div>
      </div>
    ),
    { ...size },
  );
}
