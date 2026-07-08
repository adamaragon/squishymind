'use client';

import { useState } from 'react';
import { clearConversationId } from '@/lib/squishy';

type Props = {
  action: () => Promise<void>;
};

export default function DeleteAccountButton({ action }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async () => {
        if (!confirm('Permanently delete your account and all maps? This cannot be undone.')) {
          return;
        }
        setBusy(true);
        // Clear before the deletion so a failure mid-way doesn't leave a
        // stale conversation tied to a deleted account.
        clearConversationId();
        try {
          await action();
        } finally {
          setBusy(false);
        }
      }}
    >
        <button type="submit" className="btn btn-danger min-h-[44px]" disabled={busy}>
        {busy ? <><span className="spin" /> Deleting…</> : 'Delete my account'}
      </button>
    </form>
  );
}
