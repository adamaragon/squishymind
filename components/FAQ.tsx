'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'Do I have to use the voice agent?',
    a: "Absolutely not. Squishy is a feature, not a religion. Click and drag works, keyboard shortcuts work, the whole tool functions perfectly without ever talking to her. She's there if you want her, muted if you don't.",
  },
  {
    q: 'How long is the beta?',
    a: "As long as it takes us to feel proud of it. Probably a few months. We'll let you know clearly before it ends — we'd rather not spring pricing on you like a trapdoor.",
  },
  {
    q: 'Will signing up now really be free forever?',
    a: 'Yes. Your account stays on the free-forever plan, regardless of what we charge new users later. Even if our future investors get ideas about “monetization.” We’ve put it in writing. The writing is on this page.',
  },
  {
    q: 'When does pricing kick in for new users?',
    a: "After beta. Likely a small monthly fee with a generous free tier. We'll announce well in advance — and beta users keep their grandfathered free plan. We're not going to be cute about this.",
  },
  {
    q: 'What happens to my mind maps if pricing kicks in?',
    a: "Nothing. They're yours. Beta users keep everything they've built and continue at no cost. New users will be able to view any map you share with them.",
  },
  {
    q: "How do I know I'm a beta user?",
    a: "If you sign up while this banner is still showing at the top of the page, you're in. Once we leave beta, the banner comes down and so does the free-forever offer. Now go sign up.",
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
    a: "There's nothing to cancel — it's free, remember? To delete your account: Account page, two clicks, no email, no exit interview. We respect your right to leave. Reluctantly.",
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
