export default function ModalRekapMenu({ arrayGroupedPenjualan, rincianPenjualan, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-[#011f7b]">
          <h2 className="font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#FFBA09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Rekap Menu Terjual
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-[#FFBA09] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-grow bg-[#EFEEEA]/50">
          {arrayGroupedPenjualan.length === 0 ? (
            <p className="text-center text-sm font-medium py-8 opacity-60">Belum ada menu yang terjual hari ini.</p>
          ) : (
            <div className="space-y-4">
              {arrayGroupedPenjualan.map((group, idx) => (
                <div key={idx} className="border border-[#011f7b]/10 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="bg-[#011f7b] px-3 py-2.5 flex justify-between items-center">
                    <span className="font-bold text-white">{group.namaDasar}</span>
                    <span className="font-black text-[#011f7b] text-xs bg-[#FFBA09] px-2.5 py-1 rounded-full">{group.totalQty} Porsi</span>
                  </div>
                  <div className="bg-white p-3 space-y-2">
                    {group.rincian.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFBA09] flex-shrink-0"></span>
                          <span className="text-[#011f7b] font-medium">{item.name}</span>
                        </div>
                        <div className="flex gap-3 text-[#011f7b] text-xs font-semibold">
                          <span className="bg-[#EFEEEA] px-2 py-0.5 rounded">{item.qty}x</span>
                          <span className="text-[#011f7b] font-bold">Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-[#011f7b]/10">
                      <span className="text-xs font-semibold text-[#011f7b]/60">Pendapatan {group.namaDasar}</span>
                      <span className="text-sm font-bold text-[#011f7b]">Rp {group.totalUang.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#011f7b]/10 bg-[#EFEEEA] flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs text-[#011f7b]/60 font-semibold uppercase tracking-wide">Total Seluruh Item</span>
            <span className="font-black text-[#011f7b] text-lg">
              {rincianPenjualan.reduce((sum, i) => sum + i.qty, 0)} Pcs
            </span>
          </div>
          <button onClick={onClose} className="bg-[#011f7b] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#FFBA09] hover:text-[#011f7b] transition-all active:scale-95 shadow-md">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}