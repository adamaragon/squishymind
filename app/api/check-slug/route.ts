import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const RESERVED = new Set(['login', 'signup', 'dashboard', 'account', 'share', 'api', 'about', 'privacy', 'terms']);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.toLowerCase().trim() ?? '';
  const excludeId = req.nextUrl.searchParams.get('excludeId') ?? '';

  if (!slug) return NextResponse.json({ available: false, reason: 'empty' });
  if (slug.length < 2) return NextResponse.json({ available: false, reason: 'too short' });
  if (slug.length > 60) return NextResponse.json({ available: false, reason: 'too long' });
  if (!SLUG_RE.test(slug)) return NextResponse.json({ available: false, reason: 'invalid characters' });
  if (RESERVED.has(slug)) return NextResponse.json({ available: false, reason: 'reserved' });

  const supabase = await createClient();
  const query = supabase.from('mindmaps').select('id').eq('slug', slug).limit(1);
  if (excludeId) query.neq('id', excludeId);
  const { data } = await query;

  return NextResponse.json({ available: !data?.length });
}
