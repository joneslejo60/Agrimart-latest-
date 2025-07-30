import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredOrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: string;
  units: string;
  price?: number;
}

const ORDER_ITEMS_STORAGE_KEY = '@manual_order_items';

export const getStoredOrderItems = async (): Promise<StoredOrderItem[]> => {
  try {
    const orderItemsData = await AsyncStorage.getItem(ORDER_ITEMS_STORAGE_KEY);
    return orderItemsData ? JSON.parse(orderItemsData) : [];
  } catch (error) {
    console.error('Error getting stored order items:', error);
    return [];
  }
};

export const saveOrderItems = async (orderItems: StoredOrderItem[]): Promise<void> => {
  try {
    // Only save items that have at least a product name
    const validItems = orderItems.filter(item => item.productName.trim() !== '');
    await AsyncStorage.setItem(ORDER_ITEMS_STORAGE_KEY, JSON.stringify(validItems));
  } catch (error) {
    console.error('Error saving order items:', error);
  }
};

export const clearOrderItems = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ORDER_ITEMS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing order items:', error);
  }
};