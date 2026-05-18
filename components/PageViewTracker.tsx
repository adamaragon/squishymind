'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

/** Tiny client island that fires a single analytics event on mount. Dropped
 *  into server-rendered pages that want to be counted in the admin Activity
 *  feed (e.g. /pricing, /founder-access) without converting the whole page
 *  to a client component. */
export default function PageViewTracker({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    track(event, properties);
    // Intentionally no dependency array on event/properties — page-view is a
    // one-shot per mount. If the parent re-renders with new props we still
    // only want one event per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
