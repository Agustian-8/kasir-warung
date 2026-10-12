import { menuItems } from '../data/menu';

const KATEGORI = [
  { key: 'food', label: 'Makanan' },
  { key: 'snack', label: 'Cemilan' },
  { key: 'drink', label: 'Minuman' },
];

export default function KatalogMenu({ activeKategori, setActiveKategori, onAddToCart }) {
  const menuTampil = menuItems.filter(m => m.type === activeKategori);

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-md border border-[#011f7b]/10 overflow-hidden">
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-[#011f7b]/10 bg-[#011f7b]/5">
        {KATEGORI.map(kat => (
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
          <MenuCard key={item.id} item={item} onAddToCart={onAddToCart} />
        ))}
      </div>
    </div>
  );
}

function MenuCard({ item, onAddToCart }) {
  return (
    <div className="bg-[#EFEEEA]/60 border border-[#011f7b]/10 p-3 lg:p-4 rounded-xl flex flex-col justify-between hover:shadow-md hover:border-[#011f7b]/30 transition-all">
      <div className="mb-3">
        <h3 className="font-bold text-sm lg:text-base leading-tight">{item.name}</h3>
        {item.type !== 'food' && (
          <p className="font-bold text-sm mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
        )}
      </div>
      <div className="mt-auto">
        {item.type === 'snack' && (
          <div className="grid grid-cols-3 gap-1 lg:gap-2">
            <button onClick={() => onAddToCart(item, 1)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs lg:text-sm active:scale-95 transition-all">+1</button>
            <button onClick={() => onAddToCart(item, 5)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs lg:text-sm active:scale-95 transition-all">+5</button>
            <button onClick={() => onAddToCart(item, 10)} className="bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all">+10</button>
          </div>
        )}

        {item.type === 'food' && (
          <div className="grid grid-cols-2 gap-1 lg:gap-2">
            <button onClick={() => onAddToCart(item, 1, '', 0)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Biasa</button>
            <button onClick={() => onAddToCart(item, 1, '+ ½ Telur', 2000)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">+ ½ Telur</button>
            <button onClick={() => onAddToCart(item, 1, '+ 1 Telur', 3000)} className="bg-[#011f7b]/30 hover:bg-[#011f7b]/40 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">+ 1 Telur</button>
            <button onClick={() => onAddToCart(item, 1, 'Komplit', 5000)} className="bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs active:scale-95 transition-all">Komplit</button>
          </div>
        )}

        {item.type === 'drink' && item.name === 'Teh' && (
          <div className="grid grid-cols-2 gap-1 lg:gap-2">
            <button onClick={() => onAddToCart(item, 1, 'Dingin', 0)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Dingin</button>
            <button onClick={() => onAddToCart(item, 1, 'Hangat', 0)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Hangat</button>
          </div>
        )}

        {item.type === 'drink' && item.name === 'Kopi' && (
          <div className="grid grid-cols-2 gap-1 lg:gap-2">
            <button onClick={() => onAddToCart(item, 1, 'Hitam', 0)} className="bg-[#011f7b]/10 hover:bg-[#011f7b]/20 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Hitam</button>
            <button onClick={() => onAddToCart(item, 1, 'Susu', 0)} className="bg-[#011f7b]/20 hover:bg-[#011f7b]/30 py-2 rounded-lg font-semibold text-xs active:scale-95 transition-all">Susu</button>
          </div>
        )}

        {item.type === 'drink' && item.name !== 'Teh' && item.name !== 'Kopi' && (
          <button onClick={() => onAddToCart(item, 1)} className="w-full bg-[#011f7b] text-white hover:bg-[#01155a] py-2 rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all">Pesan</button>
        )}
      </div>
    </div>
  );
}