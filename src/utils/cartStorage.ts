import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: any;
  description?: string;
  quantity: number;
  source?: 'groceries' | 'agri-input';
}

const CART_STORAGE_KEY = '@cart_items';

export const getCartItems = async (): Promise<CartItem[]> => {
  try {
    const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    console.error('Error getting cart items:', error);
    return [];
  }
};


export const saveCartItems = async (cartItems: CartItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch (error) {
    console.error('Error saving cart items:', error);
  }
};

export const addToCart = async (product: Omit<CartItem, 'quantity'>): Promise<CartItem[]> => {
  try {
    const currentCart = await getCartItems();
    const existingItem = currentCart.find(item => item.id === product.id);
    
    let updatedCart: CartItem[];
    if (existingItem) {
      updatedCart = currentCart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...currentCart, { ...product, quantity: 1 }];
    }
    
    await saveCartItems(updatedCart);
    return updatedCart;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return [];
  }
};

export const removeFromCart = async (productId: string): Promise<CartItem[]> => {
  try {
    const currentCart = await getCartItems();
    const existingItem = currentCart.find(item => item.id === productId);
    
    let updatedCart: CartItem[];
    if (existingItem && existingItem.quantity > 1) {
      updatedCart = currentCart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    } else {
      updatedCart = currentCart.filter(item => item.id !== productId);
    }
    
    await saveCartItems(updatedCart);
    return updatedCart;
  } catch (error) {
    console.error('Error removing from cart:', error);
    return [];
  }
};

export const clearCart = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
};

export const getCartItemQuantity = (cartItems: CartItem[], productId: string): number => {
  const item = cartItems.find(item => item.id === productId);
  return item ? item.quantity : 0;
};