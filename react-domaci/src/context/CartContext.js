import React, { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Učitaj korpu iz localStorage prilikom pokretanja
  useEffect(() => {
    const savedCart = localStorage.getItem("ticketmaster-cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Greška pri učitavanju korpe:", error);
      }
    }
  }, []);

  // Sačuvaj korpu u localStorage kad god se promeni
  useEffect(() => {
    localStorage.setItem("ticketmaster-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // Dodaj u korpu
  const addToCart = (item) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existingItem) {
        // Ako već postoji, povećaj količinu
        return prevItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        // Dodaj novi item
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  };

  // Ukloni iz korpe
  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  // Ažuriraj količinu
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Očisti korpu
  const clearCart = () => {
    setCartItems([]);
  };

  // Izračunaj ukupnu cenu
  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  // Izračunaj ukupan broj stavki
  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const contextValue = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  };

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};
