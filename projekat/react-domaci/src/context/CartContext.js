import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import useLocalStorage from "../hooks/useLocalStorage";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems, removeCartItems] = useLocalStorage(
    "ticketmaster-cart",
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Clear cart when user logs out
  useEffect(() => {
    if (!isAuthenticated()) {
      removeCartItems();
    }
  }, [isAuthenticated, removeCartItems]);

  // Add item to cart
  const addToCart = (item) => {
    if (!isAuthenticated()) {
      throw new Error("Morate biti prijavljeni da biste dodali stavke u korpu");
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (cartItem) => cartItem.event_id === item.event_id
      );

      if (existingItem) {
        // Increase quantity
        return prevItems.map((cartItem) =>
          cartItem.event_id === item.event_id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + (item.quantity || 1),
              }
            : cartItem
        );
      }

      // Add new item
      return [
        ...prevItems,
        { ...item, quantity: item.quantity || 1, id: Date.now() },
      ];
    });
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  // Update quantity
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

  // Clear entire cart
  const clearCart = () => {
    removeCartItems();
  };

  // Calculate total price
  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + (parseFloat(item.price) || 0) * item.quantity,
      0
    );
  };

  // Calculate total items
  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Check if item is in cart
  const isInCart = (eventId) => {
    return cartItems.some((item) => item.event_id === eventId);
  };

  // Get item quantity
  const getItemQuantity = (eventId) => {
    const item = cartItems.find((item) => item.event_id === eventId);
    return item ? item.quantity : 0;
  };

  // Validate cart items (check if events are still available)
  const validateCart = async () => {
    // This would typically call an API to check availability
    // For now, we'll just return the current cart
    return cartItems;
  };

  // Apply discount
  const applyDiscount = (discountCode) => {
    // Placeholder for discount functionality
    console.log("Applying discount:", discountCode);
    return Promise.resolve({
      success: false,
      message: "Discount functionality not implemented",
    });
  };

  const contextValue = {
    cartItems,
    isProcessing,
    setIsProcessing,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    isInCart,
    getItemQuantity,
    validateCart,
    applyDiscount,
  };

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
