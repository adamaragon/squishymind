'use client';

import { useState } from 'react';

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
        try {
          await action();
        } finally {
          setBusy(false);
        }
      }}
    >
      <button type="submit" className="btn btn-danger" disabled={busy}>
        {busy ? 'Deleting…' : 'Delete my account'}
      </button>
    </form>
  );
}
