import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';

// Generic per-node file attachments. Distinct from /api/upload which is the
// image-only path the canvas's detail-view image button uses. The two share
// the same storage bucket because uploads are auth-gated by user folder.

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — bigger than image-only because
                                     // PDFs and zips are commonly larger than 5 MB.

// A reasonable allow-list: documents, archives, images, plain text/data.
// Anything else we explicitly reject (no opaque .exe / .bat / etc.).
const ALLOWED = new Set([
  // images (also accepted on this route — convenient for "add file" UX)
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf',
  // archives
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  'application/x-7z-compressed',
  'application/x-tar',
  // text / data
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
  // audio / video — small clips only, capped by MAX_BYTES anyway
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'too_large', limit: MAX_BYTES },
      { status: 413 },
    );
  }
  // Some browsers leave type empty for unusual extensions; reject anything we
  // can't positively identify rather than guessing.
  if (!file.type || !ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'bad_type', type: file.type || 'unknown' },
      { status: 415 },
    );
  }

  const safeOriginalName = file.name
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .slice(0, 80);
  const ext =
    safeOriginalName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'bin';
  const path = `${user.id}/attachments/${randomBytes(16).toString('hex')}.${ext}`;

  const { error } = await supabase.storage
    .from('node-images')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from('node-images').getPublicUrl(path);
  return NextResponse.json({
    url: pub.publicUrl,
    path,
    name: safeOriginalName || `file.${ext}`,
    type: file.type,
    size: file.size,
  });
}
