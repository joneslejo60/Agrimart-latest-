import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from './cartStorage';
import apiService from '../services/apiService';
import userService from '../services/userService';

// API order response interface
export interface ApiOrderResponse {
  id: string;
  createdAt: string;
  orderStatusId: string;
  totalAmount: number;
  shippingAddress: any;
  orderItems?: Array<{
    productId: string;
    name?: string;
    price: number;
    quantity: number;
  }>;
}

// API create order response interface
export interface ApiCreateOrderResponse {
  orderId: string;
}

export interface Order {
  id: string;
  orderId: string;
  date: string;
  month: string;
  year: string;
  status: 'delivered' | 'processing' | 'cancelled';
  items: CartItem[];
  totalAmount: number;
  address: any;
  userId?: string;
}

const ORDERS_STORAGE_KEY = '@orders';

// Get all orders from storage and API
export const getOrders = async (userId?: string): Promise<Order[]> => {
  try {
    // First get orders from local storage
    const storedOrdersJson = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    let localOrders: Order[] = storedOrdersJson ? JSON.parse(storedOrdersJson) : [];
    
    // Filter by userId if provided
    if (userId) {
      localOrders = localOrders.filter(order => order.userId === userId);
    }
    
    // If we have a userId, try to get orders from API as well
    if (userId) {
      try {
        const response = await apiService.order.getUserOrders(userId);
        
        if (response.success && Array.isArray(response.data)) {
          // Convert API order format to our frontend Order interface
          const apiOrders = response.data.map((apiOrder: any) => {
            // Create a date object for formatting
            const orderDate = new Date(apiOrder.createdAt || Date.now());
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
            
            // Format date components
            const day = orderDate.getDate().toString().padStart(2, '0');
            const month = (orderDate.getMonth() + 1).toString().padStart(2, '0');
            const year = orderDate.getFullYear().toString().slice(2);
            const monthName = months[orderDate.getMonth()];
            const yearFull = orderDate.getFullYear().toString();
            
            // Map order status ID to our status strings
            let status: 'delivered' | 'processing' | 'cancelled' = 'processing';
            if (apiOrder.orderStatusId === '2') {
              status = 'delivered';
            } else if (apiOrder.orderStatusId === '3') {
              status = 'cancelled';
            }
            
            // Convert API order items to our CartItem format
            const items: CartItem[] = Array.isArray(apiOrder.orderItems) 
              ? apiOrder.orderItems.map((item: { productId: string; name?: string; price: number; quantity: number }) => ({
                  id: item.productId,
                  name: item.name || 'Product',
                  price: item.price,
                  quantity: item.quantity,
                  image: '', // The OrderItem from API doesn't have imageUrl, so use empty string as default
                  category: ''
                }))
              : [];
            
            // Make sure all required fields are present
            return {
              id: apiOrder.id || '',
              orderId: apiOrder.id || `ORD-${Date.now().toString().slice(-6)}`,
              date: `${day}/${month}/${year}`,
              month: monthName,
              year: yearFull,
              status: status,
              items: items,
              totalAmount: apiOrder.totalAmount || 0,
              address: apiOrder.shippingAddress || {},
              userId: userId
            };
          });
          
          // Merge API orders with local orders, preferring API orders for duplicates
          const apiOrderIds = new Set(apiOrders.map(order => order.orderId));
          const filteredLocalOrders = localOrders.filter(order => !apiOrderIds.has(order.orderId));
          
          return [...apiOrders, ...filteredLocalOrders];
        }
      } catch (apiError) {
        console.error('Error getting orders from API:', apiError);
        // Continue with local orders if API fails
      }
    }
    
    // Return local orders if API fails or userId not provided
    return localOrders;
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
};

// Save an order to local storage
export const saveOrder = async (order: Order): Promise<void> => {
  try {
    // Get existing orders
    const storedOrdersJson = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    const storedOrders: Order[] = storedOrdersJson ? JSON.parse(storedOrdersJson) : [];
    
    // Check if order with same ID already exists
    const existingOrderIndex = storedOrders.findIndex(o => o.orderId === order.orderId);
    
    if (existingOrderIndex >= 0) {
      // Update existing order
      storedOrders[existingOrderIndex] = {
        ...storedOrders[existingOrderIndex],
        ...order,
        // Ensure the ID is unique by adding a timestamp if needed
        id: order.id || `${order.orderId}-${Date.now()}`
      };
      console.log('Updated existing order in local storage:', order.orderId);
    } else {
      // Ensure the order has a unique ID
      const uniqueOrder = {
        ...order,
        id: order.id || `${order.orderId}-${Date.now()}`
      };
      
      // Add the new order
      storedOrders.push(uniqueOrder);
      console.log('Added new order to local storage:', uniqueOrder.orderId);
    }
    
    // Save back to storage
    await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(storedOrders));
  } catch (error) {
    console.error('Error saving order to storage:', error);
    throw error;
  }
};

// Create a new order from cart items
export const createOrderFromCart = async (
  cartItems: CartItem[],
  totalAmount: number,
  address: any,
  userId: string
): Promise<Order> => {
  const now = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(2);
  const monthName = months[now.getMonth()];
  const yearFull = now.getFullYear().toString();
  
  // Prepare order data in the format expected by the API
  const orderData = {
    userId: userId,
    shippingAddressId: address.id || address.addressId,
    totalAmount: Number(totalAmount.toFixed(2)),
    orderStatusId: '1', // Default to processing status
    orderItems: cartItems.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      price: Number(item.price.toFixed(2)),
      name: item.name // Include name even though API might not use it
    }))
  };
  
  try {
    // Use the API service instead of direct fetch
    const response = await apiService.order.createOrder(orderData);
    
    if (response.success) {
      // Create a frontend Order object from the API response
      const responseData = response.data as ApiCreateOrderResponse;
      // Generate a unique ID that includes a timestamp to avoid duplicates
      const timestamp = Date.now();
      const orderId = responseData?.orderId || `ORD-${timestamp.toString().slice(-6)}`;
      
      const order: Order = {
        id: `${orderId}-${timestamp}`, // Ensure ID is unique with timestamp
        orderId: orderId,
        date: `${day}/${month}/${year}`,
        month: monthName,
        year: yearFull,
        status: 'processing',
        items: cartItems,
        totalAmount,
        address,
        userId
      };
      
      return order;
    } else {
      throw new Error(response.error || 'Failed to create order via API');
    }
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order via API');
  }
};