import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { menuItems } from './data/menu';

export default function App() {
  // === STATE: KERANJANG & KATEGORI ===
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('kasir_cart_sementara');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [activeKategori, setActiveKategori] = useState('food');

  // === STATE: DATA DATABASE ===
  const [totalPenjualan, setTotalPenjualan] = useState(0);
  const [uangFisikLaci, setUangFisikLaci] = useState('');
  
  const [rincianPenjualan, setRincianPenjualan] = useState(() => {
    const saved = localStorage.getItem('kasir_rincian_penjualan');
    return saved ? JSON.parse(saved) : [];
  });

  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showLaporanMobile, setShowLaporanMobile] = useState(false);

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
    localStorage.setItem('kasir_rincian_penjualan', JSON.stringify(rincianPenjualan));
  }, [rincianPenjualan]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public:rekap_harian')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rekap_harian' }, (payload) => {
        setTotalPenjualan(payload.new.total_penjualan);
        
        if (payload.new.rincian_pengeluaran) {
          setRincianPengeluaran(payload.new.rincian_pengeluaran);
        }
        
        if (payload.new.rincian_penjualan) {
          setRincianPenjualan(payload.new.rincian_penjualan);
        }

        if (payload.new.penyesuaian !== undefined) {
          setUangFisikLaci(payload.new.penyesuaian === 0 ? '' : payload.new.penyesuaian);
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
      
      if (data.rincian_pengeluaran) {
        setRincianPengeluaran(data.rincian_pengeluaran);
      }

      if (data.rincian_penjualan) {
        setRincianPenjualan(data.rincian_penjualan);
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
    const rekapPenjualanBaru = [...rincianPenjualan];
    
    cart.forEach(cartItem => {
      const existingIndex = rekapPenjualanBaru.findIndex(item => item.cartId === cartItem.cartId);
      if (existingIndex !== -1) {
        rekapPenjualanBaru[existingIndex].qty += cartItem.qty;
        rekapPenjualanBaru[existingIndex].totalPrice += cartItem.totalPrice;
      } else {
        rekapPenjualanBaru.push({ ...cartItem });
      }
    });
    
    setTotalPenjualan(penjualanBaru);
    setRincianPenjualan(rekapPenjualanBaru);
    setCart([]);
    localStorage.removeItem('kasir_cart_sementara');

    await updateDatabase({ 
      total_penjualan: penjualanBaru, 
      pengeluaran: totalPengeluaran, 
      penyesuaian: Number(uangFisikLaci) || 0,
      rincian_penjualan: rekapPenjualanBaru 
    });
  };

  const resetRekapHarian = async () => {
    if(window.confirm('Yakin ingin mereset buku hari ini? Pastikan laporan sudah dikirim ke WhatsApp.')) {
      setTotalPenjualan(0);
      setRincianPengeluaran([]);
      setRincianPenjualan([]); 
      setUangFisikLaci('');
      
      localStorage.removeItem('kasir_rincian_pengeluaran');
      localStorage.removeItem('kasir_rincian_penjualan');
      
      await updateDatabase({ 
        total_penjualan: 0, 
        pengeluaran: 0, 
        penyesuaian: 0,
        rincian_pengeluaran: [],
        rincian_penjualan: []
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
    
    updateDatabase({ 
      pengeluaran: totalBaru,
      rincian_pengeluaran: rincianBaru 
    });
  };

  const hapusPengeluaran = (id) => {
    const rincianBaru = rincianPengeluaran.filter(p => p.id !== id);
    setRincianPengeluaran(rincianBaru);
    const totalBaru = rincianBaru.reduce((sum, item) => sum + item.nominal, 0);
    
    updateDatabase({ 
      pengeluaran: totalBaru,
      rincian_pengeluaran: rincianBaru 
    });
  };

  // === FUNGSI: UANG LACI & KALKULASI ===
  const handleUangFisikChange = (e) => {
    const angka = e.target.value.replace(/\D/g, '');
    setUangFisikLaci(angka ? Number(angka) : '');
  };

  const simpanUangFisikServer = () => {
    updateDatabase({ penyesuaian: Number(uangFisikLaci) || 0 });
  };

  const keuntunganBersih = totalPenjualan - totalPengeluaran;
  const displayUangLaci = uangFisikLaci !== '' ? uangFisikLaci : 0;
  const selisihKas = uangFisikLaci !== '' ? (displayUangLaci - keuntunganBersih) : 0;

  // === GROUPING MODAL REKAP ===
  const groupedPenjualan = rincianPenjualan.reduce((acc, item) => {
    const menuId = parseInt(item.cartId.split('-')[0]); 
    const menuAsli = menuItems.find(m => m.id === menuId); 
    const namaDasar = menuAsli ? menuAsli.name : item.name;

    if (!acc[namaDasar]) {
      acc[namaDasar] = {
        namaDasar: namaDasar,
        totalQty: 0,
        totalUang: 0,
        rincian: []
      };
    }
    
    acc[namaDasar].totalQty += item.qty;
    acc[namaDasar].totalUang += item.totalPrice;
    acc[namaDasar].rincian.push(item);
    
    return acc;
  }, {});

  const arrayGroupedPenjualan = Object.values(groupedPenjualan);

  // === FUNGSI: REPORTING ===
  const bagikanLaporan = () => {
    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // === GROUPING MENU TERJUAL (RANGKUMAN SAJA) ===
    let teksMenuTerjual = '';
    
    if (arrayGroupedPenjualan.length > 0) {
      teksMenuTerjual = arrayGroupedPenjualan
        .map(group => `- ${group.namaDasar} ${group.totalQty}x : Rp ${group.totalUang.toLocaleString('id-ID')}`)
        .join('\n');
    } else {
      teksMenuTerjual = '- Belum ada penjualan hari ini';
    }

    let teksPengeluaran = rincianPengeluaran.length > 0 
      ? rincianPengeluaran.map(p => `- ${p.nama}: Rp ${p.nominal.toLocaleString('id-ID')}`).join('\n')
      : '- Tidak ada';

    const teksLaporan = 
`*LAPORAN HARIAN WARUNG*
${tanggal}

*MENU TERJUAL HARI INI:*
${teksMenuTerjual}
━━━━━━━━━━━━━━━━━━

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

  // === FILTER MENU BERDASARKAN KATEGORI AKTIF ===
  const menuTampil = menuItems.filter(m => m.type === activeKategori);

  return (
    <div className="min-h-screen bg-[#EFEEEA] text-[#011f7b] flex flex-col relative">
      <header className="bg-[#011f7b] p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">KasirKu</h1>
        <div className="flex items-center gap-3">
          {/* TOMBOL LAPORAN MOBILE */}
          <button 
            onClick={() => setShowLaporanMobile(true)}
            className="lg:hidden bg-[#FFBA09] hover:bg-[#e6a608] text-[#011f7b] px-3 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-[#011f7b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Laporan
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-grow">
        
        {/* === AREA KIRI: KATALOG MENU === */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-md border border-[#011f7b]/10 overflow-hidden">
          
          {/* === TAB KATEGORI (3 MENU FIXED) === */}
          <div className="grid grid-cols-3 gap-2 p-3 border-b border-[#011f7b]/10 bg-[#011f7b]/5">
            {[
              { key: 'food', label: 'Makanan' },
              { key: 'snack', label: 'Cemilan' },
              { key: 'drink', label: 'Minuman' },
            ].map(kat => (
              <button 
                key={kat.key}
                onClick={() => setActiveKategori(kat.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                  activeKategori === kat.key 
                    ? 'bg-[#011f7b] text-white shadow-md' 
                    : 'bg-white text-[#011f7b] border border-[#011f7b]/20 hover:border-[#011f7b] hover:bg-[#011f7b]/5'
                }`}
              >
                {kat.label}
              </button>
            ))}
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4 overflow-y-auto max-h-[60vh] lg:max-h-full">
            {menuTampil.map(item => (
              <div 
                key={item.id} 
                className="bg-[#EFEEEA]/60 border border-[#011f7b]/10 p-3 lg:p-4 rounded-xl flex flex-col justify-between hover:shadow-md hover:border-[#011f7b]/30 transition-all duration-200"
              >
                <div className="mb-3">
                  <h3 className="font-bold text-[#011f7b] text-sm lg:text-base leading-tight">{item.name}</h3>
                  {/* Harga hanya ditampilkan untuk snack & drink, TIDAK untuk food */}
                  {item.type !== 'food' && (
                    <p className="text-[#011f7b] font-bold text-sm mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
                  )}
                </div>

                <div className="mt-auto">
                  {item.type === 'snack' ? (
                    <div className="grid grid-cols-3 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1)} className="bg-[#011f7b]/10 text-[#011f7b] hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs lg:text-sm active:scale-95 transition-all">+1</button>
                      <button onClick={() => addToCart(item, 5)} className="bg-[#011f7b]/20 text-[#011f7b] hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs lg:text-sm active:scale-95 transition-all">+5</button>
                      <button onClick={() => addToCart(item, 10)} className="bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all shadow-sm">+10</button>
                    </div>
                  ) : item.type === 'food' ? (
                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1, '', 0)} className="bg-[#011f7b]/10 text-[#011f7b] hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Biasa</button>
                      <button onClick={() => addToCart(item, 1, '+ ½ Telur', 2000)} className="bg-[#011f7b]/20 text-[#011f7b] hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">+ ½ Telur</button>
                      <button onClick={() => addToCart(item, 1, '+ 1 Telur', 3000)} className="bg-[#011f7b]/30 text-[#011f7b] hover:bg-[#011f7b]/40 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">+ 1 Telur</button>
                      <button onClick={() => addToCart(item, 1, 'Komplit', 5000)} className="bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs active:scale-95 transition-all shadow-sm">Komplit</button>
                    </div>
                  ) : item.name === 'Teh' ? (
                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1, 'Dingin', 0)} className="bg-[#011f7b]/10 text-[#011f7b] hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Dingin</button>
                      <button onClick={() => addToCart(item, 1, 'Hangat', 0)} className="bg-[#011f7b]/20 text-[#011f7b] hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Hangat</button>
                    </div>
                  ) : item.name === 'Kopi' ? (
                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1, 'Hitam', 0)} className="bg-[#011f7b]/10 text-[#011f7b] hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Hitam</button>
                      <button onClick={() => addToCart(item, 1, 'Susu', 0)} className="bg-[#011f7b]/20 text-[#011f7b] hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Susu</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item, 1)} className="w-full bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all shadow-sm">Pesan</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === AREA TENGAH: KERANJANG === */}
        <div className="w-full lg:w-96 bg-white rounded-2xl shadow-md border border-[#011f7b]/10 flex flex-col h-auto max-h-[50vh] lg:max-h-full">
          <div className="p-4 border-b border-[#011f7b]/10 bg-[#FFBA09] rounded-t-2xl flex items-center justify-between">
            <h2 className="text-base font-bold text-[#011f7b] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#011f7b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Keranjang
            </h2>
            <span className="bg-[#011f7b] text-white text-xs font-bold px-2.5 py-1 rounded-full">{cart.length} item</span>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-50">
                <svg className="w-12 h-12 text-[#011f7b] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-center text-[#011f7b] text-sm font-medium">Belum ada pesanan.</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.cartId} className="flex flex-col py-3 border-b border-[#011f7b]/10 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-[#011f7b] text-sm">{item.name}</span>
                    <span className="font-bold text-[#011f7b] text-sm">Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center bg-[#EFEEEA] rounded-lg border border-[#011f7b]/10 overflow-hidden">
                      <button onClick={() => kurangiQty(item.cartId)} className="w-8 h-8 text-[#011f7b] hover:bg-[#011f7b] hover:text-white active:scale-90 transition-all font-bold">−</button>
                      <span className="w-10 text-center font-bold text-sm text-[#011f7b]">{item.qty}</span>
                      <button onClick={() => tambahQty(item.cartId)} className="w-8 h-8 text-[#011f7b] hover:bg-[#011f7b] hover:text-white active:scale-90 transition-all font-bold">+</button>
                    </div>
                    <button 
                      onClick={() => hapusItem(item.cartId)} 
                      className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all active:scale-95"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-[#011f7b]/10 bg-[#EFEEEA] rounded-b-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#011f7b] font-semibold text-sm">Total Bayar</span>
              <span className="text-xl font-black text-[#011f7b]">Rp {totalKeranjang.toLocaleString('id-ID')}</span>
            </div>
            <button 
              onClick={prosesPembayaran} 
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

        {/* === AREA KANAN: REKAPITULASI & PENGELUARAN === */}
        <div className={`
          ${showLaporanMobile ? 'fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4' : 'hidden'}
          lg:flex lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0
          w-full lg:w-80 flex-col gap-4
        `}>
          <div className={`
            ${showLaporanMobile ? 'bg-[#EFEEEA] w-full max-w-md p-4 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up' : 'w-full'}
            flex flex-col gap-4 lg:bg-transparent lg:p-0 lg:max-h-full lg:overflow-visible lg:animate-none lg:shadow-none
          `}>
            
            {/* Header Modal Khusus Mobile */}
            {showLaporanMobile && (
              <div className="flex justify-between items-center mb-2 lg:hidden">
                <h3 className="font-bold text-lg text-[#011f7b]">
                  Laporan & Kas
                </h3>
                <button 
                  onClick={() => setShowLaporanMobile(false)} 
                  className="bg-[#011f7b] text-white hover:bg-[#FFBA09] hover:text-[#011f7b] rounded-full w-8 h-8 flex items-center justify-center font-bold transition-all active:scale-90"
                >
                  &times;
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-md border border-[#011f7b]/10 p-5">
              <h3 className="font-bold text-[#011f7b] mb-4 text-center border-b border-[#011f7b]/10 pb-3">
                Laporan Harian
              </h3>
              
              {/* TOMBOL LIHAT MENU TERJUAL */}
              <button 
                onClick={() => setShowRekapModal(true)}
                className="w-full mb-4 bg-[#FFBA09] hover:bg-[#e6a608] text-[#011f7b] py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-[#011f7b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Lihat Menu Terjual Hari Ini
              </button>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase tracking-wide">Total Penjualan</p>
                  <p className="text-sm font-bold text-[#011f7b]">Rp {totalPenjualan.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase tracking-wide">Uang Di Laci</p>
                  <p className="text-sm font-bold text-[#011f7b]">Rp {displayUangLaci.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase tracking-wide">Selisih</p>
                  {uangFisikLaci !== '' ? (
                    <p className={`text-sm font-bold ${selisihKas >= 0 ? 'text-[#011f7b]' : 'text-[#000000]'}`}>
                      {selisihKas >= 0 ? `+${selisihKas.toLocaleString('id-ID')}` : selisihKas.toLocaleString('id-ID')}
                    </p>
                  ) : (
                    <p className="text-xs text-[#011f7b]/40 italic">Belum diinput</p>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#011f7b]/10">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase tracking-wide">Total Pengeluaran</p>
                  <p className="text-sm font-bold text-red-600">- Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
                </div>
                <div className="pt-3 border-t-2 border-[#FFBA09] bg-[#FFBA09]/10 rounded-lg p-3 -mx-1">
                  <p className="text-xs font-bold text-[#011f7b]/70 uppercase text-center mb-1 tracking-wide">Laba Bersih</p>
                  <p className={`text-2xl text-center font-black ${keuntunganBersih >= 0 ? 'text-[#011f7b]' : 'text-[#000000]'}`}>
                    Rp {keuntunganBersih.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-[#011f7b]/10 p-4">
              
              <label className="block text-sm font-bold text-[#011f7b] mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#011f7b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Total Uang Di Laci
              </label>
              <input 
                type="text" 
                inputMode="numeric"
                value={uangFisikLaci ? uangFisikLaci.toLocaleString('id-ID') : ''}
                onChange={handleUangFisikChange}
                onBlur={simpanUangFisikServer}
                className="w-full bg-[#EFEEEA] border border-[#011f7b]/20 text-[#011f7b] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 transition-all mb-4 font-semibold"
                placeholder="Masukkan hitungan asli uang laci..."
              />

              <label className="block text-sm font-bold text-[#011f7b] mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#011f7b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Catat Pengeluaran
              </label>
              <div className="flex flex-col gap-2 mb-3">
                <input 
                  type="text" 
                  value={inputNamaPengeluaran}
                  onChange={(e) => setInputNamaPengeluaran(e.target.value)}
                  className="w-full bg-[#EFEEEA] border border-[#011f7b]/20 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 transition-all"
                  placeholder="Nama (Misal: Gas, Bumbu)"
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={inputNominalPengeluaran ? Number(inputNominalPengeluaran).toLocaleString('id-ID') : ''}
                    onChange={(e) => setInputNominalPengeluaran(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#EFEEEA] border border-[#011f7b]/20 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 transition-all"
                    placeholder="Rp..."
                  />
                  <button 
                    onClick={handleTambahPengeluaran}
                    className="flex-shrink-0 bg-[#011f7b] text-white hover:bg-[#01155a] px-4 py-2.5 rounded-lg text-sm font-bold active:scale-95 transition-all shadow-sm"
                  >
                    Add +
                  </button>
                </div>
              </div>

              {rincianPengeluaran.length > 0 && (
                <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1">
                  {rincianPengeluaran.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-red-50 p-2.5 rounded-lg border border-red-200 text-xs">
                      <span className="font-semibold text-[#011f7b]">{item.nama}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">Rp {item.nominal.toLocaleString('id-ID')}</span>
                        <button onClick={() => hapusPengeluaran(item.id)} className="text-[#011f7b]/40 hover:text-red-600 font-bold px-1 transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={bagikanLaporan} 
                className="w-full mb-2 mt-2 bg-[#011f7b] hover:bg-[#01155a] text-white py-3 rounded-lg font-bold text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 text-[#FFBA09]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Kirim Otomatis ke WA
              </button>
              
              <button 
                onClick={resetRekapHarian} 
                className="w-full py-3 bg-white border-2 border-[#011f7b]/20 text-[#011f7b] hover:border-[#FFBA09] hover:bg-[#FFBA09]/10 rounded-lg font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tutup Buku
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* === MODAL POP-UP REKAP PENJUALAN === */}
      {showRekapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Header Modal */}
            <div className="p-4 border-b border-[#011f7b]/10 flex justify-between items-center bg-[#011f7b]">
              <h2 className="font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#FFBA09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Rekap Menu Terjual
              </h2>
              <button 
                onClick={() => setShowRekapModal(false)} 
                className="text-white/70 hover:text-[#FFBA09] font-bold text-2xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>
            
            {/* Isi Daftar Menu */}
            <div className="p-4 overflow-y-auto flex-grow bg-[#EFEEEA]/50">
              {arrayGroupedPenjualan.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-60">
                  <svg className="w-12 h-12 text-[#011f7b] mb-2 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-center text-[#011f7b] text-sm font-medium">Belum ada menu yang terjual hari ini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {arrayGroupedPenjualan.map((group, idx) => (
                    <div key={idx} className="border border-[#011f7b]/10 rounded-xl overflow-hidden shadow-sm bg-white">
                      
                      {/* Header Grup */}
                      <div className="bg-[#011f7b] px-3 py-2.5 flex justify-between items-center">
                        <span className="font-bold text-white">{group.namaDasar}</span>
                        <span className="font-black text-[#011f7b] text-xs bg-[#FFBA09] px-2.5 py-1 rounded-full">
                          {group.totalQty} Porsi
                        </span>
                      </div>
                      
                      {/* Rincian Varian */}
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
                        
                        {/* Subtotal */}
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
            
            {/* Footer Modal */}
            <div className="p-4 border-t border-[#011f7b]/10 bg-[#EFEEEA] flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-[#011f7b]/60 font-semibold uppercase tracking-wide">Total Seluruh Item</span>
                <span className="font-black text-[#011f7b] text-lg">
                  {rincianPenjualan.reduce((sum, i) => sum + i.qty, 0)} Pcs
                </span>
              </div>
              <button 
                onClick={() => setShowRekapModal(false)} 
                className="bg-[#011f7b] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#FFBA09] hover:text-[#011f7b] transition-all active:scale-95 shadow-md"
              >
                Tutup
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}