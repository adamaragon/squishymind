import Footer from '@/components/Footer';

export default function EditorLoading() {
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#04050c]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin" />
          <p className="text-sm text-white/40">Loading your map…</p>
        </div>
      </div>
      <Footer minimal />
    </>
  );
}
