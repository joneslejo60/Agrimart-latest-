import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCartItems, saveCartItems, CartItem } from '../utils/cartStorage';

interface CartContextProps {
  cartItems: CartItem[];
  cartCount: number;
  setCartItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItemsState] = useState<CartItem[]>([]);

  // Calculate cart count (total number of items, not unique products)
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  
  // Debug logging for cart count
  useEffect(() => {
    console.log('🛒 CartContext - Cart count updated:', cartCount, 'items:', cartItems.length);
  }, [cartCount, cartItems.length]);

  // Load cart items from storage on mount
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  const loadCartFromStorage = async () => {
    try {
      const storedItems = await getCartItems();
      console.log('🛒 CartContext - Loaded items from storage:', storedItems.length);
      setCartItemsState(storedItems || []);
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      setCartItemsState([]);
    }
  };

  const setCartItems = async (items: CartItem[]) => {
    // Ensure we always have a valid array
    const validItems = Array.isArray(items) ? items : [];
    setCartItemsState(validItems);
    try {
      await saveCartItems(validItems);
    } catch (error) {
      console.error('Error saving cart items:', error);
    }
  };

  const addItem = async (newItem: CartItem) => {
    // Validate the new item
    if (!newItem || !newItem.id || !newItem.name) {
      console.error('Invalid item provided to addItem:', newItem);
      return;
    }

    const existingItemIndex = cartItems.findIndex(item => item.id === newItem.id);
    
    let updatedItems: CartItem[];
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      updatedItems = cartItems.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + newItem.quantity }
          : item
      );
    } else {
      // Add new item
      updatedItems = [...cartItems, newItem];
    }
    
    setCartItemsState(updatedItems);
    try {
      await saveCartItems(updatedItems);
    } catch (error) {
      console.error('Error saving cart after adding item:', error);
    }
  };

  const removeItem = async (productId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== productId);
    setCartItemsState(updatedItems);
    try {
      await saveCartItems(updatedItems);
    } catch (error) {
      console.error('Error saving cart after removing item:', error);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    const updatedItems = cartItems.map(item =>
      item.id === productId ? { ...item, quantity } : item
    );
    
    setCartItemsState(updatedItems);
    try {
      await saveCartItems(updatedItems);
    } catch (error) {
      console.error('Error saving cart after updating quantity:', error);
    }
  };

  const clearCart = async () => {
    setCartItemsState([]);
    try {
      await saveCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const refreshCart = async () => {
    await loadCartFromStorage();
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        setCartItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextProps => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};