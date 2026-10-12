export default function Keranjang({ cart, totalKeranjang, onTambah, onKurangi, onHapus, onBayar }) {
  return (
    <div className="w-full lg:w-96 bg-white rounded-2xl shadow-md border border-[#011f7b]/10 flex flex-col h-auto max-h-[50vh] lg:max-h-full">
      <div className="p-4 border-b border-[#011f7b]/10 bg-[#FFBA09] rounded-t-2xl flex items-center justify-between">
        <h2 className="text-base font-bold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Keranjang
        </h2>
        <span className="bg-[#011f7b] text-white text-xs font-bold px-2.5 py-1 rounded-full">{cart.length} item</span>
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        {cart.length === 0 ? (
          <p className="text-center text-sm font-medium py-8 opacity-50">Belum ada pesanan.</p>
        ) : (
          cart.map(item => (
            <div key={item.cartId} className="flex flex-col py-3 border-b border-[#011f7b]/10 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm">{item.name}</span>
                <span className="font-bold text-sm">Rp {item.totalPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center bg-[#EFEEEA] rounded-lg border border-[#011f7b]/10 overflow-hidden">
                  <button onClick={() => onKurangi(item.cartId)} className="w-8 h-8 hover:bg-[#011f7b] hover:text-white active:scale-90 transition-all font-bold">−</button>
                  <span className="w-10 text-center font-bold text-sm">{item.qty}</span>
                  <button onClick={() => onTambah(item.cartId)} className="w-8 h-8 hover:bg-[#011f7b] hover:text-white active:scale-90 transition-all font-bold">+</button>
                </div>
                <button onClick={() => onHapus(item.cartId)} className="text-xs font-bold text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all active:scale-95">Hapus</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-[#011f7b]/10 bg-[#EFEEEA] rounded-b-2xl">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-sm">Total Bayar</span>
          <span className="text-xl font-black">Rp {totalKeranjang.toLocaleString('id-ID')}</span>
        </div>
        <button
          onClick={onBayar}
          disabled={cart.length === 0}
          className="w-full py-3 bg-[#011f7b] text-white rounded-lg font-bold hover:bg-[#01155a] disabled:bg-[#011f7b]/20 disabled:text-[#011f7b]/40 active:scale-[0.98] transition-all shadow-md disabled:shadow-none flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Bayar Pesanan
        </button>
      </div>
    </div>
  );
}