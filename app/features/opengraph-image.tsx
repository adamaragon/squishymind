import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SquishyMind features — voice AI, real-time collaboration, four views';
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
          background: 'linear-gradient(135deg, #0a0b16 0%, #0a1a2a 45%, #1a0b2e 100%)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: -200, left: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -200, right: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ display: 'flex', fontSize: 28, color: '#a5f3fc', marginBottom: 20, zIndex: 1 }}>
          <span style={{ padding: '4px 14px', borderRadius: 999, background: 'rgba(6,182,212,0.18)', border: '1px solid rgba(6,182,212,0.5)', display: 'flex' }}>Features</span>
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)', backgroundClip: 'text', color: 'transparent', zIndex: 1 }}>
          Everything you need to map an idea
        </div>
        <div style={{ fontSize: 30, color: '#9ca3af', marginTop: 28, lineHeight: 1.4, maxWidth: 900, zIndex: 1 }}>
          A voice AI that builds branches for you, real-time collaboration, four views of one map, and imports from everywhere.
        </div>
        <div style={{ position: 'absolute', bottom: 56, right: 80, display: 'flex', fontSize: 22, color: '#e8e6f0', zIndex: 1 }}>squishymind.com</div>
      </div>
    ),
    { ...size },
  );
}
