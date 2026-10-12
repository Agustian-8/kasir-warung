import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export const useBukuKas = () => {
  const [bukuKas, setBukuKas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchBukuKas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('buku_kas')
      .select('*')
      .order('no_urut', { ascending: false, nullsFirst: false })
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false });
    if (!error && data) setBukuKas(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBukuKas();
    const channel = supabase
      .channel('public:buku_kas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buku_kas' }, () => fetchBukuKas())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const totalPages = Math.ceil(bukuKas.length / perPage);
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [bukuKas.length, perPage]);

  const simpan = async (payload, id = null) => {
    const res = id
      ? await supabase.from('buku_kas').update(payload).eq('id', id)
      : await supabase.from('buku_kas').insert(payload);
    if (res.error) return { error: res.error };
    await fetchBukuKas();
    return { success: true };
  };

  const hapus = async (id) => {
    if (!window.confirm('Hapus entri ini?')) return false;
    const { error } = await supabase.from('buku_kas').delete().eq('id', id);
    if (error) {
      alert('Gagal menghapus: ' + error.message);
      return false;
    }
    await fetchBukuKas();
    return true;
  };

  const totalPages = Math.ceil(bukuKas.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginated = bukuKas.slice(startIndex, endIndex);

  const totalMasuk = bukuKas.reduce((s, r) => s + (r.uang_masuk || 0), 0);
  const totalKeluar = bukuKas.reduce((s, r) => s + (r.uang_keluar || 0), 0);
  const saldoTerakhir = bukuKas[0]?.saldo_akhir || 0;

  return {
    bukuKas, loading, editId, setEditId, currentPage, setCurrentPage, perPage, setPerPage,
    paginated, totalPages, startIndex, endIndex, totalMasuk, totalKeluar, saldoTerakhir,
    simpan, hapus, refetch: fetchBukuKas,
  };
};