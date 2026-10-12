import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kasir_cart_sementara';

export const useCart = () => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item, qty = 1, variantName = '', additionalPrice = 0) => {
    const basePrice = item.price + additionalPrice;
    const itemName = variantName ? `${item.name} ${variantName}` : item.name;
    const cartId = variantName
      ? `${item.id}-${variantName.replace(/\s+/g, '')}`
      : `${item.id}-normal`;

    setCart(prev => {
      const exist = prev.find(c => c.cartId === cartId);
      if (exist) {
        return prev.map(c =>
          c.cartId === cartId
            ? { ...c, qty: c.qty + qty, totalPrice: (c.qty + qty) * basePrice }
            : c
        );
      }
      return [...prev, { cartId, name: itemName, basePrice, qty, totalPrice: basePrice * qty }];
    });
  };

  const tambahQty = (id) =>
    setCart(prev =>
      prev.map(c =>
        c.cartId === id ? { ...c, qty: c.qty + 1, totalPrice: (c.qty + 1) * c.basePrice } : c
      )
    );

  const kurangiQty = (id) =>
    setCart(prev =>
      prev
        .map(c =>
          c.cartId === id ? { ...c, qty: c.qty - 1, totalPrice: (c.qty - 1) * c.basePrice } : c
        )
        .filter(c => c.qty > 0)
    );

  const hapusItem = (id) => setCart(prev => prev.filter(c => c.cartId !== id));

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const totalKeranjang = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  return { cart, addToCart, tambahQty, kurangiQty, hapusItem, clearCart, totalKeranjang };
};