import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export const useRekapHarian = () => {
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

  useEffect(() => {
    localStorage.setItem('kasir_rincian_penjualan', JSON.stringify(rincianPenjualan));
  }, [rincianPenjualan]);

  useEffect(() => {
    localStorage.setItem('kasir_rincian_pengeluaran', JSON.stringify(rincianPengeluaran));
  }, [rincianPengeluaran]);

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

  const fetchData = async () => {
    const { data } = await supabase.from('rekap_harian').select('*').eq('id', 1).single();
    if (data) {
      setTotalPenjualan(data.total_penjualan);
      setUangFisikLaci(data.penyesuaian === 0 ? '' : data.penyesuaian);
      if (data.rincian_pengeluaran) setRincianPengeluaran(data.rincian_pengeluaran);
      if (data.rincian_penjualan) setRincianPenjualan(data.rincian_penjualan);
    }
  };

  const updateDatabase = async (dataBaru) => {
    await supabase
      .from('rekap_harian')
      .update({ ...dataBaru, updated_at: new Date() })
      .eq('id', 1);
  };

  const prosesPembayaran = async (cart, totalKeranjang) => {
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

    await updateDatabase({
      total_penjualan: penjualanBaru,
      pengeluaran: rincianPengeluaran.reduce((s, i) => s + i.nominal, 0),
      penyesuaian: Number(uangFisikLaci) || 0,
      rincian_penjualan: rekapBaru,
    });
  };

  const tambahPengeluaran = async (nama, nominal) => {
    const baru = { id: Date.now(), nama, nominal: Number(nominal) };
    const rincianBaru = [...rincianPengeluaran, baru];
    setRincianPengeluaran(rincianBaru);
    await updateDatabase({
      pengeluaran: rincianBaru.reduce((s, i) => s + i.nominal, 0),
      rincian_pengeluaran: rincianBaru,
    });
  };

  const hapusPengeluaran = async (id) => {
    const rincianBaru = rincianPengeluaran.filter(p => p.id !== id);
    setRincianPengeluaran(rincianBaru);
    await updateDatabase({
      pengeluaran: rincianBaru.reduce((s, i) => s + i.nominal, 0),
      rincian_pengeluaran: rincianBaru,
    });
  };

  const simpanUangFisik = () => updateDatabase({ penyesuaian: Number(uangFisikLaci) || 0 });

  const resetRekapHarian = async () => {
    if (totalPenjualan === 0 && rincianPengeluaran.length === 0) {
      alert('Belum ada transaksi hari ini.');
      return false;
    }
    if (!window.confirm('Reset rekap harian? Pastikan Buku Kas sudah diinput manual.')) return false;

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
      rincian_penjualan: [],
    });
    return true;
  };

  const totalPengeluaran = rincianPengeluaran.reduce((s, i) => s + i.nominal, 0);
  const keuntunganBersih = totalPenjualan - totalPengeluaran;
  const displayUangLaci = uangFisikLaci !== '' ? uangFisikLaci : 0;
  const selisihKas = uangFisikLaci !== '' ? displayUangLaci - keuntunganBersih : 0;

  return {
    totalPenjualan, uangFisikLaci, setUangFisikLaci, rincianPenjualan, rincianPengeluaran,
    totalPengeluaran, keuntunganBersih, displayUangLaci, selisihKas,
    prosesPembayaran, tambahPengeluaran, hapusPengeluaran, simpanUangFisik, resetRekapHarian,
  };
};