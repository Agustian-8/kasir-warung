import { formatTanggal } from '../utils/format';

export default function ModalBukuKas({ bk, onClose, onOpenFormTambah, onOpenFormEdit }) {
  const {
    bukuKas, loading, currentPage, setCurrentPage, perPage, setPerPage,
    paginated, totalPages, startIndex, endIndex,
    totalMasuk, totalKeluar, saldoTerakhir, hapus,
  } = bk;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">

        <div className="p-4 border-b flex justify-between items-center bg-[#011f7b]">
          <h2 className="font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#FFBA09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Buku Kas Harian
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-[#FFBA09] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                <p className="text-base sm:text-lg font-black">Rp {saldoTerakhir.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <button onClick={onOpenFormTambah} className="w-full sm:w-auto bg-[#011f7b] hover:bg-[#01155a] text-white px-4 py-2.5 rounded-lg text-sm font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Entri
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 overflow-auto flex-grow bg-[#EFEEEA]/50">
          {loading ? (
            <p className="text-center py-12 font-medium">Memuat data...</p>
          ) : bukuKas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-60">
              <svg className="w-16 h-16 mb-3 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-center text-sm font-medium px-4">
                Belum ada catatan.<br />Klik <span className="font-bold">"Tambah Entri"</span> untuk mulai.
              </p>
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
                    {paginated.map((row, idx) => (
                      <tr key={row.id} className={`border-b hover:bg-[#FFBA09]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#EFEEEA]/30'}`}>
                        <td className="px-3 py-3 font-medium">{formatTanggal(row.tanggal)}</td>
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
                          <button onClick={() => onOpenFormEdit(row)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-all mr-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => hapus(row.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-all">
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
                {paginated.map((row) => (
                  <div key={row.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="bg-[#011f7b] px-3 py-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-[#FFBA09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-bold text-white text-sm">
                          {formatTanggal(row.tanggal, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onOpenFormEdit(row)} className="text-white/70 hover:text-[#FFBA09] p-1.5 rounded active:scale-90">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => hapus(row.id)} className="text-white/70 hover:text-red-400 p-1.5 rounded active:scale-90">
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

              {/* Total Keseluruhan (desktop) */}
              <div className="hidden md:grid mt-4 grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 border border-[#011f7b]/10 shadow-sm">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Total Uang Masuk</p>
                  <p className="text-lg font-black text-green-700 mt-1">
                    + Rp {totalMasuk.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#011f7b]/10 shadow-sm">
                  <p className="text-xs font-semibold text-[#011f7b]/60 uppercase">Total Uang Keluar</p>
                  <p className="text-lg font-black text-red-700 mt-1">
                    - Rp {totalKeluar.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-[#011f7b] rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-[#FFBA09] uppercase">Saldo Terakhir</p>
                  <p className="text-lg font-black text-white mt-1">
                    Rp {saldoTerakhir.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-3 sm:p-4 border-t bg-[#EFEEEA] flex justify-end">
          <button onClick={onClose} className="w-full sm:w-auto bg-[#011f7b] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#FFBA09] hover:text-[#011f7b] transition-all active:scale-95 shadow-md">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}