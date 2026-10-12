export default function Header({ onOpenBukuKas, onOpenLaporan }) {
  return (
    <header className="bg-[#011f7b] p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
      <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">KasirKu</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenBukuKas}
          className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs lg:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 border border-white/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Buku Kas
        </button>
        <button
          onClick={onOpenLaporan}
          className="lg:hidden bg-[#FFBA09] hover:bg-[#e6a608] text-[#011f7b] px-3 py-2 rounded-lg text-xs font-bold active:scale-95 transition-all shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Laporan
        </button>
      </div>
    </header>
  );
}