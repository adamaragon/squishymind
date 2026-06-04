'use client';

import { useEffect, useRef, useState } from 'react';

type Role = 'editor' | 'commenter';

type Member = {
  user_id: string;
  role: Role;
  invited_at: string;
  email: string | null;
  display_name: string | null;
};

type Props = {
  mindmapId: string;
  isOwner: boolean;
  currentUserId: string;
  onClose: () => void;
};

export default function MembersPanel({ mindmapId, isOwner, currentUserId, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}/members`);
      if (res.ok) {
        const body = await res.json();
        setMembers(body.members || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmapId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function invite() {
    setInviting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setMessage({ kind: 'err', text: e.error || 'Invite failed' });
      } else {
        setMessage({ kind: 'ok', text: `Invited ${email.trim()} as ${role}.` });
        setEmail('');
        load();
      }
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, newRole: Role) {
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)),
    );
    await fetch(`/api/mindmaps/${mindmapId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role: newRole }),
    });
    load();
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this collaborator? They lose access immediately.')) return;
    await fetch(`/api/mindmaps/${mindmapId}/members?user_id=${userId}`, {
      method: 'DELETE',
    });
    load();
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Manage collaborators"
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl max-w-lg w-full p-7"
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-semibold">Members</h2>
          <button
            onClick={onClose}
            className="text-[--text-dim] hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-violet-500/10 px-3 py-2 text-xs flex items-start gap-2">
          <span className="text-pink-300 font-semibold shrink-0">PREMIUM</span>
          <span className="text-[--text-dim] leading-snug">
            Collaboration — invites, live cursors, real-time sync, comments — will
            be on the paid Premium tier after beta. Free for you right now, and{' '}
            <span className="text-white">40% off forever</span> on Premium if
            you signed up during the beta banner (Founder Access).
          </span>
        </div>

        {isOwner && (
          <div className="mb-6 pb-6 border-b border-white/10">
            <h3 className="text-sm font-medium mb-3">Invite by email</h3>
            <div className="flex gap-2 flex-wrap">
              <input
                className="input flex-1 min-w-[12rem]"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email.trim() && !inviting) invite();
                }}
              />
              <select
                className="input"
                style={{ width: 'auto' }}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="editor">Editor</option>
                <option value="commenter">Commenter</option>
              </select>
              <button
                onClick={invite}
                className="btn btn-primary text-sm"
                disabled={inviting || !email.trim()}
              >
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
            </div>
            {message && (
              <p
                className={`text-xs mt-2 ${
                  message.kind === 'err' ? 'text-red-300' : 'text-[--text-dim]'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium mb-3">
            Collaborators {members.length > 0 && `(${members.length})`}
          </h3>
          {loading ? (
            <p className="text-sm text-[--text-dim]">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-[--text-dim]">
              No collaborators yet. {isOwner ? 'Invite someone above.' : ''}
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const name = m.display_name || m.email || 'Unknown';
                const isSelf = m.user_id === currentUserId;
                return (
                  <li key={m.user_id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {name}
                        {isSelf && <span className="text-[--text-dim]"> (you)</span>}
                      </div>
                      {m.email && m.display_name && (
                        <div className="text-xs text-[--text-dim] truncate">{m.email}</div>
                      )}
                    </div>
                    {isOwner ? (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.user_id, e.target.value as Role)}
                          className="input text-xs"
                          style={{ width: 'auto' }}
                        >
                          <option value="editor">Editor</option>
                          <option value="commenter">Commenter</option>
                        </select>
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="btn btn-danger text-xs"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-[--text-dim] capitalize">{m.role}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
