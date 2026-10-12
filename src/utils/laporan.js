export const buatTeksLaporan = ({
  arrayGroupedPenjualan,
  rincianPengeluaran,
  totalPenjualan,
  displayUangLaci,
  uangFisikLaci,
  selisihKas,
  totalPengeluaran,
  keuntunganBersih,
}) => {
  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const teksMenu = arrayGroupedPenjualan.length > 0
    ? arrayGroupedPenjualan
        .map(g => `- ${g.namaDasar} ${g.totalQty}x : Rp ${g.totalUang.toLocaleString('id-ID')}`)
        .join('\n')
    : '- Belum ada penjualan';

  const teksPengeluaran = rincianPengeluaran.length > 0
    ? rincianPengeluaran
        .map(p => `- ${p.nama}: Rp ${p.nominal.toLocaleString('id-ID')}`)
        .join('\n')
    : '- Tidak ada';

  return `*LAPORAN HARIAN WARUNG*
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
};

export const kirimKeWhatsApp = (teks, nomor = '6289514215508') => {
  window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(teks)}`, '_blank');
};