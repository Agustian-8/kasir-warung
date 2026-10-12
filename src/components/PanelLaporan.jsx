import { parseAngka } from '../utils/format';

export default function PanelLaporan({
  showLaporanMobile,
  setShowLaporanMobile,
  rekap,
  onOpenRekap,
  inputNamaPengeluaran,
  setInputNamaPengeluaran,
  inputNominalPengeluaran,
  setInputNominalPengeluaran,
  onTambahPengeluaran,
  onBagikanLaporan,
}) {
  const {
    totalPenjualan, uangFisikLaci, setUangFisikLaci, rincianPengeluaran,
    totalPengeluaran, keuntunganBersih, displayUangLaci, selisihKas,
    simpanUangFisik, hapusPengeluaran, resetRekapHarian,
  } = rekap;

  const handleUangFisikChange = (e) => {
    const angka = e.target.value.replace(/\D/g, '');
    setUangFisikLaci(angka ? Number(angka) : '');
  };

  const handleReset = async () => {
    await resetRekapHarian();
  };

  return (
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Card Laporan Harian */}
        <div className="bg-white rounded-2xl shadow-md border border-[#011f7b]/10 p-5">
          <h3 className="font-bold mb-4 text-center border-b border-[#011f7b]/10 pb-3">Laporan Harian</h3>
          <button
            onClick={onOpenRekap}
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
            onBlur={simpanUangFisik}
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
                onChange={(e) => setInputNominalPengeluaran(parseAngka(e.target.value))}
                className="w-full bg-[#EFEEEA] border border-[#011f7b]/20 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#011f7b] focus:ring-2 focus:ring-[#FFBA09]/40 transition-all"
                placeholder="Rp 0"
              />
              <button onClick={onTambahPengeluaran} className="flex-shrink-0 bg-[#011f7b] text-white hover:bg-[#01155a] px-4 py-2.5 rounded-lg text-sm font-bold active:scale-95 transition-all shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
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
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={onBagikanLaporan} className="w-full mb-2 mt-2 bg-[#011f7b] hover:bg-[#01155a] text-white py-3 rounded-lg font-bold text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-[#FFBA09]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Kirim Laporan ke WhatsApp
          </button>

          <button onClick={handleReset} className="w-full py-3 bg-white border-2 border-[#011f7b]/20 hover:border-[#FFBA09] hover:bg-[#FFBA09]/10 rounded-lg font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Rekap Harian
          </button>
        </div>
      </div>
    </div>
  );
}