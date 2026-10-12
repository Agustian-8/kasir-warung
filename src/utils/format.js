export const formatRupiah = (angka) => {
  if (angka === '' || angka === null || angka === undefined) return 'Rp 0';
  return `Rp ${Number(angka).toLocaleString('id-ID')}`;
};

export const formatRupiahSingkat = (angka) => {
  if (!angka) return '0';
  return Number(angka).toLocaleString('id-ID');
};

export const parseAngka = (str) => String(str).replace(/\D/g, '');

export const formatTanggal = (tanggal, opsi = {}) => {
  const defaultOpsi = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(tanggal).toLocaleDateString('id-ID', { ...defaultOpsi, ...opsi });
};