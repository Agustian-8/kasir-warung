import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { menuItems } from './data/menu';

export default function App() {
  // === STATE: KERANJANG & KATEGORI ===
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('kasir_cart_sementara');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [activeKategori, setActiveKategori] = useState('Semua');

  // === STATE: DATA DATABASE (REKAP HARIAN) ===
  const [totalPenjualan, setTotalPenjualan] = useState(0);
  const [uangFisikLaci, setUangFisikLaci] = useState(''); // String kosong agar input tidak default 0

  // === STATE: PENGELUARAN ===
  const [rincianPengeluaran, setRincianPengeluaran] = useState(() => {
    const saved = localStorage.getItem('kasir_rincian_pengeluaran');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputNamaPengeluaran, setInputNamaPengeluaran] = useState('');
  const [inputNominalPengeluaran, setInputNominalPengeluaran] = useState('');

  const totalPengeluaran = rincianPengeluaran.reduce((sum, item) => sum + item.nominal, 0);

  // === EFFECT: SIMPAN LOKAL & SINKRONISASI DATABASE ===
  useEffect(() => {
    localStorage.setItem('kasir_cart_sementara', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('kasir_rincian_pengeluaran', JSON.stringify(rincianPengeluaran));
  }, [rincianPengeluaran]);

  useEffect(() => {
    fetchData();

    // Listener realtime untuk update otomatis dari device lain
    const channel = supabase
      .channel('public:rekap_harian')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rekap_harian' }, (payload) => {
        setTotalPenjualan(payload.new.total_penjualan);
        // SINKRONISASI REAL-TIME UNTUK PENGELUARAN
        if (payload.new.rincian_pengeluaran) {
          setRincianPengeluaran(payload.new.rincian_pengeluaran);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    const { data } = await supabase
      .from('rekap_harian')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (data) {
      setTotalPenjualan(data.total_penjualan);
      setUangFisikLaci(data.penyesuaian === 0 ? '' : data.penyesuaian);
      // TARIK RINCIAN PENGELUARAN DARI DATABASE SAAT AWAL LOAD
      if (data.rincian_pengeluaran) {
        setRincianPengeluaran(data.rincian_pengeluaran);
      }
    }
  };

  const updateDatabase = async (dataBaru) => {
    await supabase
      .from('rekap_harian')
      .update({
        ...dataBaru,
        updated_at: new Date()
      })
      .eq('id', 1);
  };

  // === FUNGSI: MANAJEMEN KERANJANG ===
  const addToCart = (item, qty = 1, variantName = '', additionalPrice = 0) => {
    const basePrice = item.price + additionalPrice;
    const itemName = variantName ? `${item.name} ${variantName}` : item.name;
    const cartId = variantName ? `${item.id}-${variantName.replace(/\s+/g, '')}` : `${item.id}-normal`;

    setCart(prevCart => {
      const existingItem = prevCart.find(c => c.cartId === cartId);
      if (existingItem) {
        return prevCart.map(c => 
          c.cartId === cartId ? { ...c, qty: c.qty + qty, totalPrice: (c.qty + qty) * basePrice } : c
        );
      }
      return [...prevCart, { cartId, name: itemName, basePrice, qty, totalPrice: basePrice * qty }];
    });
  };

  const tambahQty = (cartId) => setCart(prev => prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty + 1, totalPrice: (c.qty + 1) * c.basePrice } : c));
  const kurangiQty = (cartId) => setCart(prev => prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty - 1, totalPrice: (c.qty - 1) * c.basePrice } : c).filter(c => c.qty > 0));
  const hapusItem = (cartId) => setCart(cart => cart.filter(c => c.cartId !== cartId));

  const totalKeranjang = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  // === FUNGSI: TRANSAKSI & RESET ===
  const prosesPembayaran = async () => {
    if (cart.length === 0) return;
    const penjualanBaru = totalPenjualan + totalKeranjang;
    
    setTotalPenjualan(penjualanBaru);
    setCart([]);
    localStorage.removeItem('kasir_cart_sementara');

    await updateDatabase({ 
      total_penjualan: penjualanBaru, 
      pengeluaran: totalPengeluaran, 
      penyesuaian: Number(uangFisikLaci) || 0 
    });
  };

  const resetRekapHarian = async () => {
    if(window.confirm('Yakin ingin mereset buku hari ini? Pastikan laporan sudah dikirim ke WhatsApp.')) {
      setTotalPenjualan(0);
      setRincianPengeluaran([]);
      setUangFisikLaci('');
      localStorage.removeItem('kasir_rincian_pengeluaran');
      // KOSONGKAN JUGA KOLOM RINCIAN DI DATABASE
      await updateDatabase({ 
        total_penjualan: 0, 
        pengeluaran: 0, 
        penyesuaian: 0,
        rincian_pengeluaran: []
      });
    }
  };

  // === FUNGSI: MANAJEMEN PENGELUARAN ===
  const handleTambahPengeluaran = () => {
    if (!inputNamaPengeluaran || !inputNominalPengeluaran) return;
    
    const pengeluaranBaru = {
      id: Date.now(),
      nama: inputNamaPengeluaran,
      nominal: Number(inputNominalPengeluaran)
    };

    const rincianBaru = [...rincianPengeluaran, pengeluaranBaru];
    setRincianPengeluaran(rincianBaru);
    setInputNamaPengeluaran('');
    setInputNominalPengeluaran('');

    const totalBaru = rincianBaru.reduce((sum, item) => sum + item.nominal, 0);
    
    // KIRIM JUGA DATA JSON-NYA KE DATABASE
    updateDatabase({ 
      pengeluaran: totalBaru,
      rincian_pengeluaran: rincianBaru 
    });
  };

  const hapusPengeluaran = (id) => {
    const rincianBaru = rincianPengeluaran.filter(p => p.id !== id);
    setRincianPengeluaran(rincianBaru);
    const totalBaru = rincianBaru.reduce((sum, item) => sum + item.nominal, 0);
    
    // UPDATE JUGA DATA JSON-NYA KE DATABASE SETELAH DIHAPUS
    updateDatabase({ 
      pengeluaran: totalBaru,
      rincian_pengeluaran: rincianBaru 
    });
  };

  // === FUNGSI: UANG LACI & KALKULASI AKHIR ===
  const handleUangFisikChange = (e) => {
    const angka = e.target.value.replace(/\D/g, '');
    setUangFisikLaci(angka ? Number(angka) : '');
  };

  const simpanUangFisikServer = () => {
    updateDatabase({ penyesuaian: Number(uangFisikLaci) || 0 });
  };

  const displayUangLaci = uangFisikLaci !== '' ? uangFisikLaci : 0;
  const selisihKas = uangFisikLaci !== '' ? (displayUangLaci - totalPenjualan) : 0;
  const keuntunganBersih = totalPenjualan - totalPengeluaran;

  // === FUNGSI: REPORTING ===
  const bagikanLaporan = () => {
    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let teksPengeluaran = rincianPengeluaran.length > 0 
      ? rincianPengeluaran.map(p => `- ${p.nama}: Rp ${p.nominal.toLocaleString('id-ID')}`).join('\n')
      : '- Tidak ada';

    const teksLaporan = 
`*LAPORAN HARIAN WARUNG*
${tanggal}

*TOTAL PENJUALAN* : Rp ${totalPenjualan.toLocaleString('id-ID')}
*UANG DI LACI* : Rp ${displayUangLaci.toLocaleString('id-ID')}
*SELISIH* : ${uangFisikLaci !== '' ? (selisihKas >= 0 ? '+ Rp ' + selisihKas.toLocaleString('id-ID') : '- Rp ' + Math.abs(selisihKas).toLocaleString('id-ID')) : 'Belum dihitung'}

*RINCIAN PENGELUARAN* :
${teksPengeluaran}
*TOTAL PENGELUARAN* : Rp ${totalPengeluaran.toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━
*LABA BERSIH HARI INI*
(Total Penjualan - Total Pengeluaran)
*Rp ${keuntunganBersih.toLocaleString('id-ID')}*
━━━━━━━━━━━━━━━━━━

_Dibuat Oleh © Agustian._`;

    const nomorWA = "6289514215508";
    const linkWA = `https://wa.me/${nomorWA}?text=${encodeURIComponent(teksLaporan)}`;
    window.open(linkWA, '_blank');
  };

  const menuTampil = activeKategori === 'Semua' ? menuItems : menuItems.filter(m => m.type === activeKategori);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      <header className="bg-white p-4 shadow-sm border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900">KasirKu</h1>
        <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-3 py-1 rounded-full animate-pulse">● Agustian</span>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-grow">
        
        {/* === AREA KIRI: KATALOG MENU === */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex overflow-x-auto p-3 gap-2 border-b border-slate-100 bg-slate-50 scrollbar-hide">
            {['Semua', 'food', 'snack', 'drink'].map(kat => (
              <button 
                key={kat}
                onClick={() => setActiveKategori(kat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                  activeKategori === kat ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-300'
                }`}
              >
                {kat === 'food' ? 'Makanan' : kat === 'snack' ? 'Cemilan' : kat === 'drink' ? 'Minuman' : 'Semua'}
              </button>
            ))}
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4 overflow-y-auto max-h-[60vh] lg:max-h-full">
            {menuTampil.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 p-3 lg:p-4 rounded-xl flex flex-col justify-between">
                <div className="mb-3">
                  <h3 className="font-bold text-slate-800 text-sm lg:text-base leading-tight">{item.name}</h3>
                  <p className="text-indigo-600 font-semibold text-sm mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
                </div>

                <div className="mt-auto">
                  {item.type === 'snack' ? (
                    <div className="grid grid-cols-3 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1)} className="bg-slate-100 text-slate-700 py-2 rounded-lg font-semibold text-xs lg:text-sm active:bg-slate-200">+1</button>
                      <button onClick={() => addToCart(item, 5)} className="bg-indigo-50 text-indigo-700 py-2 rounded-lg font-semibold text-xs lg:text-sm active:bg-indigo-100">+5</button>
                      <button onClick={() => addToCart(item, 10)} className="bg-indigo-600 text-white py-2 rounded-lg font-semibold text-xs lg:text-sm active:bg-indigo-700">+10</button>
                    </div>
                  ) : item.type === 'food' ? (
                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1, '', 0)} className="bg-slate-100 text-slate-700 py-2 rounded-lg font-semibold text-xs active:bg-slate-200">Biasa</button>
                      <button onClick={() => addToCart(item, 1, '+ ½ Telur', 2000)} className="bg-indigo-50 text-indigo-700 py-2 rounded-lg font-semibold text-xs active:bg-indigo-100">+ ½ Telur</button>
                      <button onClick={() => addToCart(item, 1, '+ 1 Telur', 3000)} className="bg-indigo-100 text-indigo-800 py-2 rounded-lg font-semibold text-xs active:bg-indigo-200">+ 1 Telur</button>
                      <button onClick={() => addToCart(item, 1, 'Komplit', 5000)} className="bg-indigo-600 text-white py-2 rounded-lg font-semibold text-xs active:bg-indigo-700">Komplit</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item, 1)} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold text-xs lg:text-sm active:bg-indigo-700">Pesan</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === AREA TENGAH: KERANJANG === */}
        <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-auto max-h-[50vh] lg:max-h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-base font-bold text-slate-800">Keranjang ({cart.length})</h2>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4">
            {cart.length === 0 ? (
              <p className="text-center text-slate-400 text-sm mt-4">Belum ada pesanan.</p>
            ) : (
              cart.map(item => (
                <div key={item.cartId} className="flex flex-col py-3 border-b border-slate-100 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                    <span className="font-bold text-slate-800 text-sm">Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200">
                      <button onClick={() => kurangiQty(item.cartId)} className="w-8 h-8 text-slate-600 active:bg-slate-200 rounded-l-lg">-</button>
                      <span className="w-8 text-center font-semibold text-sm flex items-center justify-center">{item.qty}</span>
                      <button onClick={() => tambahQty(item.cartId)} className="w-8 h-8 text-slate-600 active:bg-slate-200 rounded-r-lg">+</button>
                    </div>
                    <button onClick={() => hapusItem(item.cartId)} className="text-xs font-semibold text-red-500 p-2">Hapus</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-semibold text-sm">Total</span>
              <span className="text-xl font-bold text-indigo-600">Rp {totalKeranjang.toLocaleString('id-ID')}</span>
            </div>
            <button 
              onClick={prosesPembayaran} 
              disabled={cart.length === 0} 
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold disabled:bg-slate-300 disabled:text-slate-500 active:bg-indigo-700 transition"
            >
              Bayar Pesanan
            </button>
          </div>
        </div>

        {/* === AREA KANAN: REKAPITULASI & INPUT FISIK === */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          
          {/* Laporan Laba/Rugi */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-4 text-center border-b border-slate-100 pb-3">Laporan Harian</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Penjualan</p>
                <p className="text-sm font-bold text-slate-800">Rp {totalPenjualan.toLocaleString('id-ID')}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase">Uang Di Laci</p>
                <p className="text-sm font-bold text-slate-800">Rp {displayUangLaci.toLocaleString('id-ID')}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase">Selisih</p>
                {uangFisikLaci !== '' ? (
                  <p className={`text-sm font-bold ${selisihKas >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {selisihKas >= 0 ? `+${selisihKas.toLocaleString('id-ID')}` : selisihKas.toLocaleString('id-ID')}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum diinput</p>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Pengeluaran</p>
                <p className="text-sm font-bold text-rose-500">- Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
              </div>
              <div className="pt-3 border-t-2 border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase text-center mb-1">Laba Bersih</p>
                <p className={`text-2xl text-center font-black ${keuntunganBersih >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
                  Rp {keuntunganBersih.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            
            {/* Input Nominal Fisik Laci */}
            <label className="block text-sm font-semibold text-slate-700 mb-1">Total Uang Di Laci</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={uangFisikLaci ? uangFisikLaci.toLocaleString('id-ID') : ''}
              onChange={handleUangFisikChange}
              onBlur={simpanUangFisikServer}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 mb-4"
              placeholder="Masukkan hitungan asli uang laci..."
            />

            {/* Input Rincian Pengeluaran */}
            <label className="block text-sm font-semibold text-slate-700 mb-1">Catat Pengeluaran</label>
            <div className="flex flex-col gap-2 mb-3">
              <input 
                type="text" 
                value={inputNamaPengeluaran}
                onChange={(e) => setInputNamaPengeluaran(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Nama (Misal: Gas, Bumbu)"
              />
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={inputNominalPengeluaran ? Number(inputNominalPengeluaran).toLocaleString('id-ID') : ''}
                  onChange={(e) => setInputNominalPengeluaran(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Rp..."
                />
                <button 
                  onClick={handleTambahPengeluaran}
                  className="flex-shrink-0 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold active:bg-slate-700 transition"
                >
                  Add +
                </button>
              </div>
            </div>

            {/* Daftar Rincian Pengeluaran Aktif */}
            {rincianPengeluaran.length > 0 && (
              <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1">
                {rincianPengeluaran.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-rose-50 p-2 rounded border border-rose-100 text-xs">
                    <span className="font-semibold text-rose-700">{item.nama}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-600">Rp {item.nominal.toLocaleString('id-ID')}</span>
                      <button onClick={() => hapusPengeluaran(item.id)} className="text-rose-400 hover:text-rose-700 font-bold px-1">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Tombol Eksekusi Akhir */}
            <button 
              onClick={bagikanLaporan} 
              className="w-full mb-2 mt-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-lg font-bold text-sm active:bg-[#075E54] transition"
            >
              Kirim Otomatis ke WA
            </button>
            
            <button 
              onClick={resetRekapHarian} 
              className="w-full py-3 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold text-sm active:bg-slate-50 transition"
            >
              Tutup Buku (Reset Data)
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}