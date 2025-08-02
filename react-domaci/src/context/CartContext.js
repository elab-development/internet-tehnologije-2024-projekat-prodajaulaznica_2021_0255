import React, { createContext, useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems, removeCartItems] = useLocalStorage(
    "ticketmaster-cart",
    []
  );

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
            ? {
                ...cartItem,
                quantity: cartItem.quantity + (item.quantity || 1),
              }
            : cartItem
        );
      } else {
        // Dodaj novi item
        return [...prevItems, { ...item, quantity: item.quantity || 1 }];
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
    removeCartItems();
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

  // Proveri da li je proizvod u korpi
  const isInCart = (itemId) => {
    return cartItems.some((item) => item.id === itemId);
  };

  // Dobij količinu proizvoda u korpi
  const getItemQuantity = (itemId) => {
    const item = cartItems.find((item) => item.id === itemId);
    return item ? item.quantity : 0;
  };

  const contextValue = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    isInCart,
    getItemQuantity,
  };

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};

// Custom hook za lakše korišćenje CartContext
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
