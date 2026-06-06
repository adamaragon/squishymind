import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SquishyMind templates — campaigns, SEO, web builds, and more';
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
        <div style={{ position: 'absolute', top: -200, right: -160, width: 600, height: 600, background: 'radial-gradient(circle, rgba(16,185,129,0.32) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -200, left: -160, width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ display: 'flex', fontSize: 28, color: '#c4b5fd', marginBottom: 20, zIndex: 1 }}>
          <span style={{ padding: '4px 14px', borderRadius: 999, background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.5)', display: 'flex' }}>Templates</span>
        </div>
        <div style={{ fontSize: 82, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 45%, #8b5cf6 100%)', backgroundClip: 'text', color: 'transparent', zIndex: 1 }}>
          Templates for real work
        </div>
        <div style={{ fontSize: 30, color: '#9ca3af', marginTop: 28, lineHeight: 1.4, maxWidth: 920, zIndex: 1 }}>
          Marketing campaigns, SEO projects, website builds, product launches — complete plans, mapped the way a pro runs them.
        </div>
        <div style={{ position: 'absolute', bottom: 56, right: 80, display: 'flex', fontSize: 22, color: '#e8e6f0', zIndex: 1 }}>squishymind.com</div>
      </div>
    ),
    { ...size },
  );
}
