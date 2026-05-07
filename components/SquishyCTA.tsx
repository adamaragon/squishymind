export default function SquishyCTA() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <div className="glass rounded-3xl p-10 md:p-14 relative overflow-hidden">
        {/* Soft pink glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />

        <div className="relative grid md:grid-cols-[1fr,auto] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-xs mb-5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
              <span className="text-pink-300">Squishy is online</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 leading-tight">
              Talk to <span className="gradient-text">Squishy</span>. Or don&apos;t. She&apos;ll cope.
            </h2>
            <p className="text-[--text-dim] text-lg leading-relaxed mb-4 max-w-2xl">
              The pink, sentient, slightly amused brain in the corner of every page is our voice agent.
              She&apos;s not like other AI assistants — she&apos;s a 1940s film noir femme fatale who occasionally
              short-circuits into a kawaii squeak or a clinical robot when she&apos;s overwhelmed. We didn&apos;t
              plan that, exactly. She just is that way now.
            </p>
            <p className="text-[--text-dim] text-base leading-relaxed mb-3 max-w-2xl">
              Ask her how mind maps work. Ask her to build one with you while you talk. Watch nodes appear
              as you describe what&apos;s on your mind. Or see if you can make her laugh — she does that sometimes.
            </p>
            <p className="text-[--text-dim] text-sm leading-relaxed max-w-2xl border-l-2 border-violet-500/30 pl-3 py-1 bg-violet-500/5 rounded-r">
              <span className="text-violet-300 font-medium">Voice is optional.</span> Click and drag works
              perfectly well — SquishyMind is a normal mind-mapping tool that happens to have a sentient brain
              available if you want one. Use her, ignore her, leave her on mute. Your call.
            </p>
            <p className="text-[--text-dim] text-sm leading-relaxed mt-3 max-w-2xl">
              Fair warning — she&apos;ll probably try to get you to sign up. She&apos;s good at it.
            </p>
          </div>

          {/* Pointer to the widget */}
          <div className="flex flex-col items-center gap-3 text-center md:text-right">
            <div className="text-xs uppercase tracking-wider text-[--text-dim]">Click here →</div>
            <div className="text-5xl md:text-6xl animate-bounce">↘</div>
            <div className="text-xs text-[--text-dim]">(bottom-right of your screen)</div>
          </div>
        </div>
      </div>
    </section>
  );
}
