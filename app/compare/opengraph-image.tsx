import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SquishyMind vs MindMeister, Miro, Obsidian & Coggle — an honest comparison';
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
          background: 'linear-gradient(135deg, #0a0b16 0%, #2a1a05 45%, #1a0b2e 100%)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: -200, left: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(245,158,11,0.38) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -200, right: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(236,72,153,0.32) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ display: 'flex', fontSize: 28, color: '#fcd34d', marginBottom: 20, zIndex: 1 }}>
          <span style={{ padding: '4px 14px', borderRadius: 999, background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.5)', display: 'flex' }}>Compare</span>
        </div>
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)', backgroundClip: 'text', color: 'transparent', zIndex: 1 }}>
          How SquishyMind stacks up
        </div>
        <div style={{ fontSize: 30, color: '#9ca3af', marginTop: 28, lineHeight: 1.4, maxWidth: 920, zIndex: 1 }}>
          An honest, side-by-side look at MindMeister, Miro, Obsidian and Coggle — where each wins, and where we do.
        </div>
        <div style={{ position: 'absolute', bottom: 56, right: 80, display: 'flex', fontSize: 22, color: '#e8e6f0', zIndex: 1 }}>squishymind.com</div>
      </div>
    ),
    { ...size },
  );
}
