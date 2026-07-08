'use client';

import { clearConversationId } from '@/lib/squishy';

export default function SignOutButton() {
  return (
    <form
      action="/auth/signout"
      method="post"
      onSubmit={() => {
        // Don't carry one user's Squishy session into the next user's lap.
        clearConversationId();
      }}
    >
      <button type="submit" className="btn btn-ghost min-h-[44px]">
        Sign out
      </button>
    </form>
  );
}
