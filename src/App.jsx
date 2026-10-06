import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { menuItems } from './data/menu';

export default function App() {
  // === STATE ===
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('kasir_cart_sementara');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeKategori, setActiveKategori] = useState('food');

  const [totalPenjualan, setTotalPenjualan] = useState(0);
  const [uangFisikLaci, setUangFisikLaci] = useState('');
  const [rincianPenjualan, setRincianPenjualan] = useState(() => {
    const saved = localStorage.getItem('kasir_rincian_penjualan');
    return saved ? JSON.parse(saved) : [];
  });
  const [rincianPengeluaran, setRincianPengeluaran] = useState(() => {
    const saved = localStorage.getItem('kasir_rincian_pengeluaran');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputNamaPengeluaran, setInputNamaPengeluaran] = useState('');
  const [inputNominalPengeluaran, setInputNominalPengeluaran] = useState('');

  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showLaporanMobile, setShowLaporanMobile] = useState(false);
  const [showBukuKasModal, setShowBukuKasModal] = useState(false);
  const [showFormBukuKas, setShowFormBukuKas] = useState(false);

  const [bukuKas, setBukuKas] = useState([]);
  const [loadingBukuKas, setLoadingBukuKas] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formTanggal, setFormTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSaldoAwal, setFormSaldoAwal] = useState('');
  const [formUangMasuk, setFormUangMasuk] = useState('');
  const [formUangKeluar, setFormUangKeluar] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // === HITUNGAN TURUNAN ===
  const totalPengeluaran = rincianPengeluaran.reduce((sum, item) => sum + item.nominal, 0);
  const keuntunganBersih = totalPenjualan - totalPengeluaran;
  const displayUangLaci = uangFisikLaci !== '' ? uangFisikLaci : 0;
  const selisihKas = uangFisikLaci !== '' ? displayUangLaci - keuntunganBersih : 0;
  const totalKeranjang = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const totalPages = Math.ceil(bukuKas.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const bukuKasPaginated = bukuKas.slice(startIndex, endIndex);

  const menuTampil = menuItems.filter(m => m.type === activeKategori);

  const groupedPenjualan = rincianPenjualan.reduce((acc, item) => {
    const menuId = parseInt(item.cartId.split('-')[0]);
    const menuAsli = menuItems.find(m => m.id === menuId);
    const namaDasar = menuAsli ? menuAsli.name : item.name;
    if (!acc[namaDasar]) acc[namaDasar] = { namaDasar, totalQty: 0, totalUang: 0, rincian: [] };
    acc[namaDasar].totalQty += item.qty;
    acc[namaDasar].totalUang += item.totalPrice;
    acc[namaDasar].rincian.push(item);
    return acc;
  }, {});
  const arrayGroupedPenjualan = Object.values(groupedPenjualan);

  // === HELPER ===
  const parseAngka = (str) => str.replace(/\D/g, '');
  const hitungSaldoAkhir = () => (Number(formSaldoAwal) || 0) + (Number(formUangMasuk) || 0) - (Number(formUangKeluar) || 0);

  // === EFFECT: AUTO-SAVE LOCALSTORAGE ===
  useEffect(() => {
    localStorage.setItem('kasir_cart_sementara', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('kasir_rincian_pengeluaran', JSON.stringify(rincianPengeluaran));
  }, [rincianPengeluaran]);

  useEffect(() => {
    localStorage.setItem('kasir_rincian_penjualan', JSON.stringify(rincianPenjualan));
  }, [rincianPenjualan]);

  // Reset ke halaman 1 kalau halaman melebihi total
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [bukuKas.length, perPage]);

  // === EFFECT: REALTIME SUBSCRIBE ===
  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('public:rekap_harian')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rekap_harian' }, (payload) => {
        setTotalPenjualan(payload.new.total_penjualan);
        if (payload.new.rincian_pengeluaran) setRincianPengeluaran(payload.new.rincian_pengeluaran);
        if (payload.new.rincian_penjualan) setRincianPenjualan(payload.new.rincian_penjualan);
        if (payload.new.penyesuaian !== undefined) {
          setUangFisikLaci(payload.new.penyesuaian === 0 ? '' : payload.new.penyesuaian);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    fetchBukuKas();
    const channel = supabase
      .channel('public:buku_kas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buku_kas' }, () => fetchBukuKas())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // === FUNGSI: FETCH DATA ===
  const fetchData = async () => {
    const { data } = await supabase.from('rekap_harian').select('*').eq('id', 1).single();
    if (data) {
      setTotalPenjualan(data.total_penjualan);
      setUangFisikLaci(data.penyesuaian === 0 ? '' : data.penyesuaian);
      if (data.rincian_pengeluaran) setRincianPengeluaran(data.rincian_pengeluaran);
      if (data.rincian_penjualan) setRincianPenjualan(data.rincian_penjualan);
    }
  };

  const fetchBukuKas = async () => {
    setLoadingBukuKas(true);
    const { data, error } = await supabase
      .from('buku_kas')
      .select('*')
      .order('no_urut', { ascending: false, nullsFirst: false })
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false });
    if (!error && data) setBukuKas(data);
    setLoadingBukuKas(false);
  };

  const updateDatabase = async (dataBaru) => {
    await supabase.from('rekap_harian').update({ ...dataBaru, updated_at: new Date() }).eq('id', 1);
  };

  // === FUNGSI: KERANJANG ===
  const addToCart = (item, qty = 1, variantName = '', additionalPrice = 0) => {
    const basePrice = item.price + additionalPrice;
    const itemName = variantName ? `${item.name} ${variantName}` : item.name;
    const cartId = variantName ? `${item.id}-${variantName.replace(/\s+/g, '')}` : `${item.id}-normal`;
    setCart(prev => {
      const exist = prev.find(c => c.cartId === cartId);
      if (exist) {
        return prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty + qty, totalPrice: (c.qty + qty) * basePrice } : c);
      }
      return [...prev, { cartId, name: itemName, basePrice, qty, totalPrice: basePrice * qty }];
    });
  };

  const tambahQty = (id) => setCart(prev => prev.map(c => c.cartId === id ? { ...c, qty: c.qty + 1, totalPrice: (c.qty + 1) * c.basePrice } : c));
  const kurangiQty = (id) => setCart(prev => prev.map(c => c.cartId === id ? { ...c, qty: c.qty - 1, totalPrice: (c.qty - 1) * c.basePrice } : c).filter(c => c.qty > 0));
  const hapusItem = (id) => setCart(prev => prev.filter(c => c.cartId !== id));

  // === FUNGSI: PEMBAYARAN ===
  const prosesPembayaran = async () => {
    if (cart.length === 0) return;
    const penjualanBaru = totalPenjualan + totalKeranjang;
    const rekapBaru = [...rincianPenjualan];

    cart.forEach(c => {
      const i = rekapBaru.findIndex(item => item.cartId === c.cartId);
      if (i !== -1) {
        rekapBaru[i].qty += c.qty;
        rekapBaru[i].totalPrice += c.totalPrice;
      } else {
        rekapBaru.push({ ...c });
      }
    });

    setTotalPenjualan(penjualanBaru);
    setRincianPenjualan(rekapBaru);
    setCart([]);
    localStorage.removeItem('kasir_cart_sementara');

    await updateDatabase({
      total_penjualan: penjualanBaru,
      pengeluaran: totalPengeluaran,
      penyesuaian: Number(uangFisikLaci) || 0,
      rincian_penjualan: rekapBaru
    });
  };

  // === FUNGSI: RESET REKAP HARIAN (Buku Kas tidak terpengaruh) ===
  const resetRekapHarian = async () => {
    if (totalPenjualan === 0 && totalPengeluaran === 0) {
      alert('Belum ada transaksi hari ini.');
      return;
    }
    if (!window.confirm('Reset rekap harian? Pastikan Buku Kas sudah diinput manual.')) return;

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
  };

  // === FUNGSI: PENGELUARAN ===
  const handleTambahPengeluaran = () => {
    if (!inputNamaPengeluaran || !inputNominalPengeluaran) return;
    const baru = { id: Date.now(), nama: inputNamaPengeluaran, nominal: Number(inputNominalPengeluaran) };
    const rincianBaru = [...rincianPengeluaran, baru];
    setRincianPengeluaran(rincianBaru);
    setInputNamaPengeluaran('');
    setInputNominalPengeluaran('');
    updateDatabase({
      pengeluaran: rincianBaru.reduce((s, i) => s + i.nominal, 0),
      rincian_pengeluaran: rincianBaru
    });
  };

  const hapusPengeluaran = (id) => {
    const rincianBaru = rincianPengeluaran.filter(p => p.id !== id);
    setRincianPengeluaran(rincianBaru);
    updateDatabase({
      pengeluaran: rincianBaru.reduce((s, i) => s + i.nominal, 0),
      rincian_pengeluaran: rincianBaru
    });
  };

  // === FUNGSI: UANG LACI ===
  const handleUangFisikChange = (e) => {
    const angka = e.target.value.replace(/\D/g, '');
    setUangFisikLaci(angka ? Number(angka) : '');
  };

  const simpanUangFisikServer = () => {
    updateDatabase({ penyesuaian: Number(uangFisikLaci) || 0 });
  };

  // === FUNGSI: BUKU KAS ===
  const resetForm = () => {
    setEditId(null);
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormSaldoAwal('');
    setFormUangMasuk('');
    setFormUangKeluar('');
    setFormKeterangan('');
  };

  const bukaFormTambah = () => {
    resetForm();
    if (bukuKas.length > 0) setFormSaldoAwal(bukuKas[0].saldo_akhir.toString());
    setShowFormBukuKas(true);
  };

  const bukaFormEdit = (row) => {
    setEditId(row.id);
    setFormTanggal(row.tanggal);
    setFormSaldoAwal(row.saldo_awal.toString());
    setFormUangMasuk(row.uang_masuk.toString());
    setFormUangKeluar(row.uang_keluar.toString());
    setFormKeterangan(row.keterangan || '');
    setShowFormBukuKas(true);
  };

  const simpanBukuKas = async () => {
    if (!formTanggal) return alert('Tanggal wajib diisi!');

    const payload = {
      tanggal: formTanggal,
      saldo_awal: Number(formSaldoAwal) || 0,
      uang_masuk: Number(formUangMasuk) || 0,
      uang_keluar: Number(formUangKeluar) || 0,
      saldo_akhir: hitungSaldoAkhir(),
      keterangan: formKeterangan || null
    };

    const res = editId
      ? await supabase.from('buku_kas').update(payload).eq('id', editId)
      : await supabase.from('buku_kas').insert(payload);

    if (res.error) return alert('Gagal menyimpan: ' + res.error.message);
    setShowFormBukuKas(false);
    resetForm();
    fetchBukuKas();
  };

  const hapusEntryBukuKas = async (id) => {
    if (!window.confirm('Hapus entri ini?')) return;
    const { error } = await supabase.from('buku_kas').delete().eq('id', id);
    if (error) return alert('Gagal menghapus: ' + error.message);
    fetchBukuKas();
  };

  // === FUNGSI: LAPORAN WHATSAPP ===
  const bagikanLaporan = () => {
    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const teksMenu = arrayGroupedPenjualan.length > 0
      ? arrayGroupedPenjualan.map(g => `- ${g.namaDasar} ${g.totalQty}x : Rp ${g.totalUang.toLocaleString('id-ID')}`).join('\n')
      : '- Belum ada penjualan';
    const teksPengeluaran = rincianPengeluaran.length > 0
      ? rincianPengeluaran.map(p => `- ${p.nama}: Rp ${p.nominal.toLocaleString('id-ID')}`).join('\n')
      : '- Tidak ada';

    const teksLaporan =
`*LAPORAN HARIAN WARUNG*
${tanggal}

*MENU TERJUAL HARI INI:*
${teksMenu}
━━━━━━━━━━━━━━━━━━

*TOTAL PENJUALAN* : Rp ${totalPenjualan.toLocaleString('id-ID')}
*UANG DI LACI* : Rp ${displayUangLaci.toLocaleString('id-ID')}
*SELISIH* : ${uangFisikLaci !== '' ? (selisihKas >= 0 ? '+ Rp ' + selisihKas.toLocaleString('id-ID') : '- Rp ' + Math.abs(selisihKas).toLocaleString('id-ID')) : 'Belum dihitung'}

*RINCIAN PENGELUARAN* :
${teksPengeluaran}
*TOTAL PENGELUARAN* : Rp ${totalPengeluaran.toLocaleString('id-ID')}

━━━━━━━━━━━━━━━━━━
*LABA BERSIH HARI INI*
*Rp ${keuntunganBersih.toLocaleString('id-ID')}*
━━━━━━━━━━━━━━━━━━

_Dibuat Oleh © Agustian._`;

    window.open(`https://wa.me/6289514215508?text=${encodeURIComponent(teksLaporan)}`, '_blank');
  };

  // === RENDER ===
  return (
    <div className="min-h-screen bg-[#EFEEEA] text-[#011f7b] flex flex-col relative">

      {/* HEADER */}
      <header className="bg-[#011f7b] p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">KasirKu</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBukuKasModal(true)}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs lg:text-sm font-bold active:scale-95 transition-all shadow-md flex items-center gap-2 border border-white/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Buku Kas
          </button>
          <button
            onClick={() => setShowLaporanMobile(true)}
            className="lg:hidden bg-[#FFBA09] hover:bg-[#e6a608] text-[#011f7b] px-3 py-2 rounded-lg text-xs font-bold active:scale-95 transition-all shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Laporan
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-grow">

        {/* KATALOG MENU */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-md border border-[#011f7b]/10 overflow-hidden">
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
              <div key={item.id} className="bg-[#EFEEEA]/60 border border-[#011f7b]/10 p-3 lg:p-4 rounded-xl flex flex-col justify-between hover:shadow-md hover:border-[#011f7b]/30 transition-all">
                <div className="mb-3">
                  <h3 className="font-bold text-sm lg:text-base leading-tight">{item.name}</h3>
                  {item.type !== 'food' && (
                    <p className="font-bold text-sm mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
                  )}
                </div>
                <div className="mt-auto">
                  {item.type === 'snack' ? (
                    <div className="grid grid-cols-3 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs lg:text-sm active:scale-95 transition-all">+1</button>
                      <button onClick={() => addToCart(item, 5)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs lg:text-sm active:scale-95 transition-all">+5</button>
                      <button onClick={() => addToCart(item, 10)} className="bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all">+10</button>
                    </div>
                  ) : item.type === 'food' ? (
                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1, '', 0)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Biasa</button>
                      <button onClick={() => addToCart(item, 1, '+ ½ Telur', 2000)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">+ ½ Telur</button>
                      <button onClick={() => addToCart(item, 1, '+ 1 Telur', 3000)} className="bg-[#011f7b]/30 hover:bg-[#011f7b]/40 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">+ 1 Telur</button>
                      <button onClick={() => addToCart(item, 1, 'Komplit', 5000)} className="bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs active:scale-95 transition-all">Komplit</button>
                    </div>
                  ) : item.name === 'Teh' ? (
                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1, 'Dingin', 0)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Dingin</button>
                      <button onClick={() => addToCart(item, 1, 'Hangat', 0)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Hangat</button>
                    </div>
                  ) : item.name === 'Kopi' ? (
                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                      <button onClick={() => addToCart(item, 1, 'Hitam', 0)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Hitam</button>
                      <button onClick={() => addToCart(item, 1, 'Susu', 0)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Susu</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item, 1)} className="w-full bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all">Pesan</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KERANJANG */}
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
                      <button onClick={() => kurangiQty(item.cartId)} className="w-8 h-8 hover:bg-[#011f7b] hover:text-white active:scale-90 transition-all font-bold">−</button>
                      <span className="w-10 text-center font-bold text-sm">{item.qty}</span>
                      <button onClick={() => tambahQty(item.cartId)} className="w-8 h-8 hover:bg-[#011f7b] hover:text-white active:scale-90 transition-all font-bold">+</button>
                    </div>
                    <button onClick={() => hapusItem(item.cartId)} className="text-xs font-bold text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all active:scale-95">Hapus</button>
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

        {/* PANEL KANAN: LAPORAN & KAS */}
        <div className={`
          ${showLaporanMobile ? 'fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4' : 'hidden'}
          lg:flex lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0
          w-full lg:w-80 flex-col gap-4
        `}>
          <div className={`
            ${showLaporanMobile ? 'bg-[#EFEEEA] w-full max-w-md p-4 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl' : 'w-full'}
            flex flex-col gap-4 lg:bg-transparent lg:p-0 lg:max-h-full lg:overflow-visible lg:shadow-none
          `}>
            {showLaporanMobile && (
              <div className="flex justify-between items-center mb-2 lg:hidden">
                <h3 className="font-bold text-lg">Laporan & Kas</h3>
                <button onClick={() => setShowLaporanMobile(false)} className="bg-[#011f7b] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold active:scale-90">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            {/* Card Laporan Harian */}
            <div className="bg-white rounded-2xl shadow-md border border-[#011f7b]/10 p-5">
              <h3 className="font-bold mb-4 text-center border-b border-[#011f7b]/10 pb-3">Laporan Harian</h3>
              <button
                onClick={() => setShowRekapModal(true)}
                className="w-full mb-4 bg-[#FFBA09] hover:bg-[#e6a608] py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Lihat Menu Terjual
              </button>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Total Penjualan</p>
                  <p className="text-sm font-bold">Rp {totalPenjualan.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Uang Di Laci</p>
                  <p className="text-sm font-bold">Rp {displayUangLaci.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Selisih</p>
                  {uangFisikLaci !== '' ? (
                    <p className={`text-sm font-bold ${selisihKas >= 0 ? 'text-[#011f7b]' : 'text-red-600'}`}>
                      {selisihKas >= 0 ? `+${selisihKas.toLocaleString('id-ID')}` : selisihKas.toLocaleString('id-ID')}
                    </p>
                  ) : (
                    <p className="text-xs text-[#011f7b]/40 italic">Belum diinput</p>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#011f7b]/10">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Total Pengeluaran</p>
                  <p className="text-sm font-bold text-red-600">- Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
                </div>
                <div className="pt-3 border-t-2 border-[#FFBA09] bg-[#FFBA09]/10 rounded-lg p-3 -mx-1">
                  <p className="text-xs font-bold text-[#011f7b]/70 uppercase text-center mb-1">Laba Bersih</p>
                  <p className={`text-2xl text-center font-black ${keuntunganBersih >= 0 ? 'text-[#011f7b]' : 'text-red-600'}`}>
                    Rp {keuntunganBersih.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Kas & Pengeluaran */}
            <div className="bg-white rounded-2xl shadow-md border border-[#011f7b]/10 p-4">
              <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="w-full bg-[#EFEEEA] border border-[#011f7b]/20 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 transition-all mb-4 font-semibold"
                placeholder="Rp 0"
              />

              <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  placeholder="Misal: Gas, Bumbu"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inputNominalPengeluaran ? Number(inputNominalPengeluaran).toLocaleString('id-ID') : ''}
                    onChange={(e) => setInputNominalPengeluaran(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#EFEEEA] border border-[#011f7b]/20 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 transition-all"
                    placeholder="Rp 0"
                  />
                  <button onClick={handleTambahPengeluaran} className="flex-shrink-0 bg-[#011f7b] text-white hover:bg-[#01155a] px-4 py-2.5 rounded-lg text-sm font-bold active:scale-95 transition-all shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>

              {rincianPengeluaran.length > 0 && (
                <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1">
                  {rincianPengeluaran.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-red-50 p-2.5 rounded-lg border border-red-200 text-xs">
                      <span className="font-semibold">{item.nama}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">Rp {item.nominal.toLocaleString('id-ID')}</span>
                        <button onClick={() => hapusPengeluaran(item.id)} className="text-[#011f7b]/40 hover:text-red-600 p-1 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={bagikanLaporan} className="w-full mb-2 mt-2 bg-[#011f7b] hover:bg-[#01155a] text-white py-3 rounded-lg font-bold text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-[#FFBA09]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Kirim Laporan ke WhatsApp
              </button>

              <button onClick={resetRekapHarian} className="w-full py-3 bg-white border-2 border-[#011f7b]/20 hover:border-[#FFBA09] hover:bg-[#FFBA09]/10 rounded-lg font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Rekap Harian
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL REKAP MENU */}
      {showRekapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-[#011f7b]">
              <h2 className="font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#FFBA09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Rekap Menu Terjual
              </h2>
              <button onClick={() => setShowRekapModal(false)} className="text-white/70 hover:text-[#FFBA09] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
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
              <button onClick={() => setShowRekapModal(false)} className="bg-[#011f7b] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#FFBA09] hover:text-[#011f7b] transition-all active:scale-95 shadow-md">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUKU KAS */}
      {showBukuKasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">

            <div className="p-4 border-b flex justify-between items-center bg-[#011f7b]">
              <h2 className="font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#FFBA09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Buku Kas Harian
              </h2>
              <button onClick={() => setShowBukuKasModal(false)} className="text-white/70 hover:text-[#FFBA09] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 bg-[#FFBA09]/20 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-[#011f7b]/60 uppercase">Total Entri</p>
                    <p className="text-base sm:text-lg font-black">{bukuKas.length} hari</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-[#011f7b]/60 uppercase">Saldo Terakhir</p>
                    <p className="text-base sm:text-lg font-black">Rp {(bukuKas[0]?.saldo_akhir || 0).toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <button onClick={bukaFormTambah} className="w-full sm:w-auto bg-[#011f7b] hover:bg-[#01155a] text-white px-4 py-2.5 rounded-lg text-sm font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                  Tambah Entri
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 overflow-auto flex-grow bg-[#EFEEEA]/50">
              {loadingBukuKas ? (
                <p className="text-center py-12 font-medium">Memuat data...</p>
              ) : bukuKas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-60">
                  <svg className="w-16 h-16 mb-3 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-center text-sm font-medium px-4">Belum ada catatan.<br/>Klik <span className="font-bold">"Tambah Entri"</span> untuk mulai.</p>
                </div>
              ) : (
                <>
                  {/* Tabel Desktop */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#011f7b] text-white">
                          <th className="px-3 py-3 text-left font-bold text-xs uppercase">Tanggal</th>
                          <th className="px-3 py-3 text-right font-bold text-xs uppercase">Saldo Awal</th>
                          <th className="px-3 py-3 text-right font-bold text-xs uppercase">Uang Masuk</th>
                          <th className="px-3 py-3 text-right font-bold text-xs uppercase">Uang Keluar</th>
                          <th className="px-3 py-3 text-right font-bold text-xs uppercase">Saldo Akhir</th>
                          <th className="px-3 py-3 text-center font-bold text-xs uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {bukuKasPaginated.map((row, idx) => (
                          <tr key={row.id} className={`border-b hover:bg-[#FFBA09]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#EFEEEA]/30'}`}>
                            <td className="px-3 py-3 font-medium">
                              {new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-3 py-3 text-right">Rp {row.saldo_awal.toLocaleString('id-ID')}</td>
                            <td className="px-3 py-3 text-right font-bold text-green-700">
                              {row.uang_masuk > 0 ? `+ Rp ${row.uang_masuk.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-red-700">
                              {row.uang_keluar > 0 ? `- Rp ${row.uang_keluar.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="px-3 py-3 text-right font-black bg-[#FFBA09]/10">
                              Rp {row.saldo_akhir.toLocaleString('id-ID')}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <button onClick={() => bukaFormEdit(row)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-all mr-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => hapusEntryBukuKas(row.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card View Mobile */}
                  <div className="md:hidden space-y-3">
                    {bukuKasPaginated.map((row) => (
                      <div key={row.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="bg-[#011f7b] px-3 py-2 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-[#FFBA09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-bold text-white text-sm">
                              {new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => bukaFormEdit(row)} className="text-white/70 hover:text-[#FFBA09] p-1.5 rounded active:scale-90">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => hapusEntryBukuKas(row.id)} className="text-white/70 hover:text-red-400 p-1.5 rounded active:scale-90">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="p-3 space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#011f7b]/60 font-semibold uppercase">Saldo Awal</span>
                            <span className="font-bold">Rp {row.saldo_awal.toLocaleString('id-ID')}</span>
                          </div>

                          <div className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                            <span className="text-green-800 text-xs font-semibold flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                              Uang Masuk
                            </span>
                            <span className="font-bold text-green-700 text-sm">
                              {row.uang_masuk > 0 ? `+ Rp ${row.uang_masuk.toLocaleString('id-ID')}` : 'Rp 0'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                            <span className="text-red-800 text-xs font-semibold flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                              </svg>
                              Uang Keluar
                            </span>
                            <span className="font-bold text-red-700 text-sm">
                              {row.uang_keluar > 0 ? `- Rp ${row.uang_keluar.toLocaleString('id-ID')}` : 'Rp 0'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-[#FFBA09]/15 rounded-lg px-3 py-2.5 border-2 border-[#FFBA09] mt-1">
                            <span className="text-[#011f7b] text-xs font-bold uppercase flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Saldo Akhir
                            </span>
                            <span className="font-black text-[#011f7b] text-base">Rp {row.saldo_akhir.toLocaleString('id-ID')}</span>
                          </div>

                          {row.keterangan && (
                            <div className="text-xs text-[#011f7b]/70 italic bg-[#EFEEEA]/60 rounded px-2.5 py-1.5 flex items-start gap-1.5">
                              <svg className="w-3 h-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              {row.keterangan}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {bukuKas.length > 0 && (
                    <div className="mt-4 bg-white rounded-xl border border-[#011f7b]/10 p-3 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-[#011f7b]/70">Tampilkan:</span>
                          <div className="flex gap-1">
                            {[5, 10, 20, 50].map(num => (
                              <button
                                key={num}
                                onClick={() => { setPerPage(num); setCurrentPage(1); }}
                                className={`px-2.5 py-1 rounded font-bold transition-all active:scale-95 ${
                                  perPage === num
                                    ? 'bg-[#011f7b] text-white shadow-sm'
                                    : 'bg-[#EFEEEA] text-[#011f7b] hover:bg-[#FFBA09]/30'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                            className="w-8 h-8 rounded bg-[#EFEEEA] hover:bg-[#FFBA09]/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                          </button>
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className="w-8 h-8 rounded bg-[#EFEEEA] hover:bg-[#FFBA09]/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div className="px-3 py-1.5 bg-[#011f7b] text-white rounded text-xs font-bold">
                            {currentPage} / {totalPages}
                          </div>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className="w-8 h-8 rounded bg-[#EFEEEA] hover:bg-[#FFBA09]/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                            className="w-8 h-8 rounded bg-[#EFEEEA] hover:bg-[#FFBA09]/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="text-center text-xs text-[#011f7b]/60 mt-2 font-medium">
                        Menampilkan {startIndex + 1}–{Math.min(endIndex, bukuKas.length)} dari {bukuKas.length} entri
                      </div>
                    </div>
                  )}

                  {/* Total Keseluruhan (desktop) */}
                  <div className="hidden md:grid mt-4 grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-[#011f7b]/10 shadow-sm">
                      <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Total Uang Masuk</p>
                      <p className="text-lg font-black text-green-700 mt-1">
                        + Rp {bukuKas.reduce((s, r) => s + (r.uang_masuk || 0), 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[#011f7b]/10 shadow-sm">
                      <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Total Uang Keluar</p>
                      <p className="text-lg font-black text-red-700 mt-1">
                        - Rp {bukuKas.reduce((s, r) => s + (r.uang_keluar || 0), 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="bg-[#011f7b] rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-[#FFBA09] uppercase">Saldo Terakhir</p>
                      <p className="text-lg font-black text-white mt-1">
                        Rp {(bukuKas[0]?.saldo_akhir || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t bg-[#EFEEEA] flex justify-end">
              <button onClick={() => setShowBukuKasModal(false)} className="w-full sm:w-auto bg-[#011f7b] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#FFBA09] hover:text-[#011f7b] transition-all active:scale-95 shadow-md">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM BUKU KAS */}
      {showFormBukuKas && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-[#FFBA09]">
              <h2 className="font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {editId ? 'Edit Entri' : 'Tambah Entri'}
              </h2>
              <button onClick={() => { setShowFormBukuKas(false); resetForm(); }} className="text-[#011f7b] hover:text-red-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-grow space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase">Tanggal</label>
                <input type="date" value={formTanggal} onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full bg-[#EFEEEA] border rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 font-semibold" />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase">Saldo Awal</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm">Rp</span>
                  <input type="text" inputMode="numeric"
                    value={formSaldoAwal ? Number(formSaldoAwal).toLocaleString('id-ID') : ''}
                    onChange={(e) => setFormSaldoAwal(parseAngka(e.target.value))}
                    className="w-full bg-[#EFEEEA] border rounded-lg p-2.5 pl-10 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 font-semibold"
                    placeholder="0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-green-700 mb-1.5 uppercase">Uang Masuk</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700 font-bold text-sm">+Rp</span>
                  <input type="text" inputMode="numeric"
                    value={formUangMasuk ? Number(formUangMasuk).toLocaleString('id-ID') : ''}
                    onChange={(e) => setFormUangMasuk(parseAngka(e.target.value))}
                    className="w-full bg-green-50 border border-green-200 rounded-lg p-2.5 pl-12 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 font-semibold text-green-800"
                    placeholder="0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-red-700 mb-1.5 uppercase">Uang Keluar</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-700 font-bold text-sm">-Rp</span>
                  <input type="text" inputMode="numeric"
                    value={formUangKeluar ? Number(formUangKeluar).toLocaleString('id-ID') : ''}
                    onChange={(e) => setFormUangKeluar(parseAngka(e.target.value))}
                    className="w-full bg-red-50 border border-red-200 rounded-lg p-2.5 pl-12 text-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200 font-semibold text-red-800"
                    placeholder="0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase">Keterangan</label>
                <input type="text" value={formKeterangan} onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full bg-[#EFEEEA] border rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40"
                  placeholder="Opsional" />
              </div>

              <div className="bg-[#FFBA09]/20 border-2 border-[#FFBA09] rounded-xl p-4">
                <p className="text-xs font-bold text-[#011f7b]/70 uppercase text-center mb-1 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Saldo Akhir
                </p>
                <p className="text-2xl text-center font-black">Rp {hitungSaldoAkhir().toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="p-4 border-t bg-[#EFEEEA] flex gap-2">
              <button onClick={() => { setShowFormBukuKas(false); resetForm(); }} className="flex-1 py-2.5 bg-white border-2 border-[#011f7b]/20 rounded-lg font-bold text-sm hover:border-[#011f7b] transition-all active:scale-95">
                Batal
              </button>
              <button onClick={simpanBukuKas} className="flex-1 py-2.5 bg-[#011f7b] text-white rounded-lg font-bold text-sm hover:bg-[#01155a] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                {editId ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}