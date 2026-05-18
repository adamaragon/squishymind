/** Display helpers for file attachments. Used by both the alt-view
 *  NodeDetailPanel (React) and the canvas's imperative detail card so
 *  icons and sizes read identically everywhere. */

export function iconForAttachment(type: string): string {
  if (type.startsWith('image/')) return '🖼';
  if (type === 'application/pdf') return '📕';
  if (
    type.includes('zip') ||
    type.includes('compressed') ||
    type.includes('tar') ||
    type === 'application/gzip'
  )
    return '🗄';
  if (
    type === 'application/msword' ||
    type.includes('wordprocessingml') ||
    type === 'application/rtf'
  )
    return '📘';
  if (
    type === 'application/vnd.ms-excel' ||
    type.includes('spreadsheetml') ||
    type === 'text/csv'
  )
    return '📊';
  if (
    type === 'application/vnd.ms-powerpoint' ||
    type.includes('presentationml')
  )
    return '🎞';
  if (type.startsWith('audio/')) return '🎵';
  if (type.startsWith('video/')) return '🎬';
  if (
    type === 'application/json' ||
    type === 'application/xml' ||
    type === 'text/xml'
  )
    return '📦';
  if (type.startsWith('text/')) return '📝';
  return '📎';
}

export function humanSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
