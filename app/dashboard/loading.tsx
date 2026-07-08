import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function DashboardLoading() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">Your mind maps</h1>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-9 w-36 rounded-lg bg-white/5 animate-pulse" />
          </div>
        </div>
        <ul className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="glass rounded-2xl p-5 flex flex-col gap-3">
              <div className="h-6 w-3/4 rounded bg-white/5 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-white/5 animate-pulse" />
              <div className="flex items-center gap-2 mt-1">
                <div className="h-8 w-14 rounded-lg bg-white/5 animate-pulse" />
                <div className="h-8 w-20 rounded-lg bg-white/5 animate-pulse" />
                <div className="h-8 w-16 rounded-lg bg-white/5 animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
