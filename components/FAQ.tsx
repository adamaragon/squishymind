'use client';

import { useState } from 'react';

const faqs = [
  {
    q: "What's the deal with “Founder Access”?",
    a: "Beta is free for everybody. When we launch our paid tier (Squishy Premium, $3.99/month) you'll have already locked in Founder pricing — $1.99/month or $14.99/year, for as long as you stay subscribed. You'll also keep a more generous free tier with 8 maps and 40 voice minutes per month, even if you never upgrade to Premium. We can't promise free forever, because the voice agent costs us money to run — but we can promise Founder pricing forever, and that's a real perk we'd rather honour than break.",
  },
  {
    q: 'Do I have to use the voice agent?',
    a: "Absolutely not. Squishy is a feature, not a religion. Click and drag works, keyboard shortcuts work, the whole tool functions perfectly without ever talking to her. She's there if you want her, muted if you don't.",
  },
  {
    q: 'Can I share a map with my team?',
    a: 'Yes. Open any map you own, click Members, invite people by email as Editor (full edit) or Commenter (read-only plus comments). Once they accept, you see each other’s cursors live on the canvas, edits sync between browsers in about a second, and either of you can leave threaded comments on any node.',
  },
  {
    q: 'What’s the difference between Editor and Commenter?',
    a: 'Editors can do anything you can — add, move, delete, rename, edit notes. Commenters can read the map and leave comments on specific nodes, but can’t change the canvas itself. Useful for getting feedback without letting the reviewer rearrange the furniture.',
  },
  {
    q: 'Wait — is collaboration going to cost money?',
    a: 'Eventually, yes. Multi-user features (invites, live cursors, real-time sync, comments) will be on the paid Premium tier after beta. While the beta banner is up at the top of the page, everything’s free — and if you sign up during beta you get Founder Access: Premium for $1.99/month (half off) when it launches, plus a more generous free tier you keep even if you never upgrade. Sign up now, lock in the deal, decide later.',
  },
  {
    q: 'How long is the beta?',
    a: "As long as it takes us to feel proud of it. Probably four to six more months. We'll let you know clearly before paid tiers launch — we'd rather not spring pricing on you like a trapdoor.",
  },
  {
    q: 'What does Founder Access actually get me?',
    a: 'Three permanent things: (1) Premium for half price — $1.99/month or $14.99/year, locked in for as long as you stay subscribed; (2) a more generous free tier even if you never pay us — 8 maps, 150 nodes per map, 40 voice minutes a month, versus 5/100/20 for new users post-launch; (3) a small Founder badge on your profile. The longer page at /founder-access has the full breakdown.',
  },
  {
    q: 'When does pricing kick in for new users?',
    a: "When paid tiers launch (likely the next four to six months). New users post-launch get the standard free tier and pay $3.99/month or $29.99/year for Premium. Beta signups don't see any of those higher prices — Founder pricing is already yours.",
  },
  {
    q: 'What happens to my mind maps if pricing kicks in?',
    a: "Nothing. They're yours. Founder Access free tier covers 8 maps and 150 nodes per map — enough to keep working without paying. If you have more than that already, you'll keep them all but won't be able to create new maps until you upgrade or trim.",
  },
  {
    q: "How do I know I'm a beta user?",
    a: "If you sign up while this banner is still showing at the top of the page, you're in — Founder Access is automatic. Once paid tiers launch, the banner comes down and new signups get the standard free tier. Until then, every account is a Founder.",
  },
  {
    q: 'Why is the brain pink?',
    a: 'Because we asked ourselves what colour a sentient mind-map mascot should be, and pink was the answer that made everyone in the room slightly nervous. Then we leaned in.',
  },
  {
    q: 'Can I export my data if I leave?',
    a: 'Always. JSON export from any map today; PNG and PDF are coming. Your brain is yours. We just want to host it for you.',
  },
  {
    q: 'How do I cancel?',
    a: "To delete your account: Account page, two clicks, no email, no exit interview. We respect your right to leave. Reluctantly. If you ever come back, your Founder pricing is still available.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-semibold mb-8 text-center">Beta, simply.</h2>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <button
            key={i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className={`glass rounded-xl w-full text-left p-5 transition-all hover:border-white/20 ${
              openIdx === i ? 'border-violet-500/40' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium">{f.q}</span>
              <span className="text-[--text-dim] shrink-0">{openIdx === i ? '−' : '+'}</span>
            </div>
            {openIdx === i && (
              <p className="text-[--text-dim] text-sm leading-relaxed mt-3">{f.a}</p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
