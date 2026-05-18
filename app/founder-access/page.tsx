import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Founder Access — SquishyMind',
  description:
    'Beta-era signups get Founder Access — half off Premium forever and a more generous free tier. Here is the honest version of why.',
};

export default function FounderAccessPage() {
  return (
    <>
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-3xl mx-auto pt-16 pb-10 text-center">
          <div className="inline-block mb-5">
            <img src="/brain.svg" alt="" width={96} height={96} className="opacity-90" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5">
            <span className="gradient-text">Founder Access</span>
          </h1>
          <p className="text-lg text-[--text-dim] max-w-2xl mx-auto leading-relaxed">
            Half off Premium, forever. A more generous free tier you keep even if you
            never pay us. Awarded to every account that signed up during beta.
          </p>
        </section>

        {/* Body — long-form explainer */}
        <article className="max-w-2xl mx-auto pb-12 prose-squishy text-[--text-dim] leading-relaxed text-base">
          <h2 className="text-2xl font-semibold text-white mt-12 mb-3">
            Why we don&apos;t promise &ldquo;free forever&rdquo;
          </h2>
          <p className="mb-4">
            When we launched SquishyMind we wanted to say &ldquo;free forever for beta
            users,&rdquo; because it sounds wonderful. But it isn&apos;t a promise we can
            keep. Our voice agent — Squishy — is powered by ElevenLabs, who charge us
            real money per minute of voice. A devoted beta user who uses Squishy for 30
            minutes a month costs us $10–$15 a month to serve. Forever is a very long
            time to lose money on every devoted user.
          </p>
          <p className="mb-4">
            So we&apos;re doing something else, which is both more honest and more useful:
            <strong className="text-white"> Founder Access</strong>.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-3">
            What Founder Access actually is
          </h2>
          <p className="mb-6">
            If you signed up for SquishyMind during beta, you have Founder Access
            automatically. It means three things, all of them permanent.
          </p>

          <h3 className="text-lg font-semibold text-white mt-8 mb-2">
            1. Half off Premium, forever
          </h3>
          <p className="mb-4">
            When we launch our paid tier (Squishy Premium, $3.99/month or $29.99/year)
            you can subscribe at the Founder rate of{' '}
            <strong className="text-white">$1.99/month or $14.99/year</strong>. That
            price is locked for as long as you stay subscribed. If you cancel and come
            back, the Founder price is still available to you.
          </p>

          <h3 className="text-lg font-semibold text-white mt-8 mb-2">
            2. A more generous free tier — yours to keep
          </h3>
          <p className="mb-3">
            If you never want to pay us, that&apos;s fine. As a Founder, your free tier
            is permanently more generous than the post-launch free tier:
          </p>
          <ul className="list-disc list-outside ml-5 mb-4 space-y-1.5">
            <li>8 maps (vs. 5 for new users post-launch)</li>
            <li>150 nodes per map (vs. 100)</li>
            <li>40 voice minutes per month (vs. 20)</li>
          </ul>
          <p className="mb-4">
            You keep this whether or not you ever pay for Premium.
          </p>

          <h3 className="text-lg font-semibold text-white mt-8 mb-2">3. A small badge</h3>
          <p className="mb-4">
            Visible on your profile and on maps you share publicly. Tasteful, we
            promise. The kind of thing people pretend not to care about and then
            absolutely do.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-3">
            What about new features?
          </h2>
          <p className="mb-4">
            Every feature that ships in Squishy Premium becomes available to Founder
            Access users at the Founder price. Premium price changes don&apos;t change
            your Founder price. The deal you signed up for is the deal you keep.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-3">
            How to claim it
          </h2>
          <p className="mb-4">
            You already have it. Every beta-era signup is a Founder. When paid tiers
            launch, you&apos;ll see a &ldquo;Founder pricing&rdquo; badge on the upgrade
            screen and the price will already be the Founder rate. Nothing to do.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-3">
            What &ldquo;beta-era&rdquo; means
          </h2>
          <p className="mb-8">
            Beta ends when we launch paid tiers — likely some time in the next four to
            six months. After that, new signups get the standard free tier and Premium
            pricing. Sign up before then and you&apos;re in.
          </p>

          <div className="text-center mt-12 mb-4">
            <Link href="/signup" className="btn btn-primary text-base px-8 py-3">
              Sign up free →
            </Link>
            <p className="text-xs text-[--text-dim] mt-3">
              Or{' '}
              <Link href="/pricing" className="underline hover:text-white">
                see the full pricing
              </Link>
              .
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
