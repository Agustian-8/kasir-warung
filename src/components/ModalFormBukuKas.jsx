import { useState, useEffect } from 'react';
import { parseAngka } from '../utils/format';

export default function ModalFormBukuKas({ bk, onClose }) {
  const { editId, bukuKas, simpan } = bk;

  const [formTanggal, setFormTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSaldoAwal, setFormSaldoAwal] = useState('');
  const [formUangMasuk, setFormUangMasuk] = useState('');
  const [formUangKeluar, setFormUangKeluar] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');

  // Init form saat buka (edit atau tambah)
  useEffect(() => {
    if (editId) {
      const row = bukuKas.find(r => r.id === editId);
      if (row) {
        setFormTanggal(row.tanggal);
        setFormSaldoAwal(row.saldo_awal.toString());
        setFormUangMasuk(row.uang_masuk.toString());
        setFormUangKeluar(row.uang_keluar.toString());
        setFormKeterangan(row.keterangan || '');
      }
    } else {
      setFormTanggal(new Date().toISOString().split('T')[0]);
      setFormSaldoAwal(bukuKas.length > 0 ? bukuKas[0].saldo_akhir.toString() : '');
      setFormUangMasuk('');
      setFormUangKeluar('');
      setFormKeterangan('');
    }
  }, [editId, bukuKas]);

  const hitungSaldoAkhir = () =>
    (Number(formSaldoAwal) || 0) + (Number(formUangMasuk) || 0) - (Number(formUangKeluar) || 0);

  const handleSimpan = async () => {
    if (!formTanggal) return alert('Tanggal wajib diisi!');

    const payload = {
      tanggal: formTanggal,
      saldo_awal: Number(formSaldoAwal) || 0,
      uang_masuk: Number(formUangMasuk) || 0,
      uang_keluar: Number(formUangKeluar) || 0,
      saldo_akhir: hitungSaldoAkhir(),
      keterangan: formKeterangan || null,
    };

    const res = await simpan(payload, editId);
    if (res.error) return alert('Gagal menyimpan: ' + res.error.message);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-[#FFBA09]">
          <h2 className="font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {editId ? 'Edit Entri' : 'Tambah Entri'}
          </h2>
          <button onClick={onClose} className="text-[#011f7b] hover:text-red-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
          <button onClick={onClose} className="flex-1 py-2.5 bg-white border-2 border-[#011f7b]/20 rounded-lg font-bold text-sm hover:border-[#011f7b] transition-all active:scale-95">
            Batal
          </button>
          <button onClick={handleSimpan} className="flex-1 py-2.5 bg-[#011f7b] text-white rounded-lg font-bold text-sm hover:bg-[#01155a] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            {editId ? 'Update' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}