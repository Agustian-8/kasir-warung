import { useState } from 'react';
import Header from './components/Header';
import KatalogMenu from './components/KatalogMenu';
import Keranjang from './components/Keranjang';
import PanelLaporan from './components/PanelLaporan';
import ModalRekapMenu from './components/ModalRekapMenu';
import ModalBukuKas from './components/ModalBukuKas';
import ModalFormBukuKas from './components/ModalFormBukuKas';
import { useCart } from './hooks/useCart';
import { useRekapHarian } from './hooks/useRekapHarian';
import { useBukuKas } from './hooks/useBukuKas';
import { menuItems } from './data/menu';
import { buatTeksLaporan, kirimKeWhatsApp } from './utils/laporan';

export default function App() {
  const [activeKategori, setActiveKategori] = useState('food');
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showLaporanMobile, setShowLaporanMobile] = useState(false);
  const [showBukuKasModal, setShowBukuKasModal] = useState(false);
  const [showFormBukuKas, setShowFormBukuKas] = useState(false);
  const [inputNamaPengeluaran, setInputNamaPengeluaran] = useState('');
  const [inputNominalPengeluaran, setInputNominalPengeluaran] = useState('');

  const cartHook = useCart();
  const rekap = useRekapHarian();
  const bk = useBukuKas();

  // Grouping menu terjual untuk rekap
  const groupedPenjualan = rekap.rincianPenjualan.reduce((acc, item) => {
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

  const handleBayar = async () => {
    await rekap.prosesPembayaran(cartHook.cart, cartHook.totalKeranjang);
    cartHook.clearCart();
  };

  const handleTambahPengeluaran = () => {
    if (!inputNamaPengeluaran || !inputNominalPengeluaran) return;
    rekap.tambahPengeluaran(inputNamaPengeluaran, inputNominalPengeluaran);
    setInputNamaPengeluaran('');
    setInputNominalPengeluaran('');
  };

  const handleBagikanLaporan = () => {
    const teks = buatTeksLaporan({
      arrayGroupedPenjualan,
      rincianPengeluaran: rekap.rincianPengeluaran,
      totalPenjualan: rekap.totalPenjualan,
      displayUangLaci: rekap.displayUangLaci,
      uangFisikLaci: rekap.uangFisikLaci,
      selisihKas: rekap.selisihKas,
      totalPengeluaran: rekap.totalPengeluaran,
      keuntunganBersih: rekap.keuntunganBersih,
    });
    kirimKeWhatsApp(teks);
  };

  const handleBukaFormTambah = () => {
    bk.setEditId(null);
    setShowFormBukuKas(true);
  };

  const handleBukaFormEdit = (row) => {
    bk.setEditId(row.id);
    setShowFormBukuKas(true);
  };

  return (
    <div className="min-h-screen bg-[#EFEEEA] text-[#011f7b] flex flex-col relative">
      <Header
        onOpenBukuKas={() => setShowBukuKasModal(true)}
        onOpenLaporan={() => setShowLaporanMobile(true)}
      />

      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-grow">
        <KatalogMenu
          activeKategori={activeKategori}
          setActiveKategori={setActiveKategori}
          onAddToCart={cartHook.addToCart}
        />

        <Keranjang
          cart={cartHook.cart}
          totalKeranjang={cartHook.totalKeranjang}
          onTambah={cartHook.tambahQty}
          onKurangi={cartHook.kurangiQty}
          onHapus={cartHook.hapusItem}
          onBayar={handleBayar}
        />

        <PanelLaporan
          showLaporanMobile={showLaporanMobile}
          setShowLaporanMobile={setShowLaporanMobile}
          rekap={rekap}
          onOpenRekap={() => setShowRekapModal(true)}
          inputNamaPengeluaran={inputNamaPengeluaran}
          setInputNamaPengeluaran={setInputNamaPengeluaran}
          inputNominalPengeluaran={inputNominalPengeluaran}
          setInputNominalPengeluaran={setInputNominalPengeluaran}
          onTambahPengeluaran={handleTambahPengeluaran}
          onBagikanLaporan={handleBagikanLaporan}
        />
      </div>

      {showRekapModal && (
        <ModalRekapMenu
          arrayGroupedPenjualan={arrayGroupedPenjualan}
          rincianPenjualan={rekap.rincianPenjualan}
          onClose={() => setShowRekapModal(false)}
        />
      )}

      {showBukuKasModal && (
        <ModalBukuKas
          bk={bk}
          onClose={() => setShowBukuKasModal(false)}
          onOpenFormTambah={handleBukaFormTambah}
          onOpenFormEdit={handleBukaFormEdit}
        />
      )}

      {showFormBukuKas && (
        <ModalFormBukuKas
          bk={bk}
          onClose={() => { setShowFormBukuKas(false); bk.setEditId(null); }}
        />
      )}
    </div>
  );
}