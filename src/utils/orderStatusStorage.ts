import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDER_STATUS_KEY = 'order_status_updates';

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  updatedAt: string;
}

export class OrderStatusStorage {
  static async saveOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const existingUpdates = await this.getAllOrderStatusUpdates();
      const updatedOrders = {
        ...existingUpdates,
        [orderId]: {
          orderId,
          status,
          updatedAt: new Date().toISOString()
        }
      };
      
      await AsyncStorage.setItem(ORDER_STATUS_KEY, JSON.stringify(updatedOrders));
      console.log(`📦 Order status saved: ${orderId} -> ${status}`);
    } catch (error) {
      console.error('Error saving order status:', error);
    }
  }

  static async getOrderStatus(orderId: string): Promise<string | null> {
    try {
      const updates = await this.getAllOrderStatusUpdates();
      return updates[orderId]?.status || null;
    } catch (error) {
      console.error('Error getting order status:', error);
      return null;
    }
  }

  static async getAllOrderStatusUpdates(): Promise<Record<string, OrderStatusUpdate>> {
    try {
      const data = await AsyncStorage.getItem(ORDER_STATUS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting all order status updates:', error);
      return {};
    }
  }

  static async clearOrderStatus(orderId: string): Promise<void> {
    try {
      const existingUpdates = await this.getAllOrderStatusUpdates();
      delete existingUpdates[orderId];
      await AsyncStorage.setItem(ORDER_STATUS_KEY, JSON.stringify(existingUpdates));
      console.log(`📦 Order status cleared: ${orderId}`);
    } catch (error) {
      console.error('Error clearing order status:', error);
    }
  }

  static async clearAllOrderStatuses(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ORDER_STATUS_KEY);
      console.log('📦 All order statuses cleared');
    } catch (error) {
      console.error('Error clearing all order statuses:', error);
    }
  }

  // Helper method to get the effective status of an order (local override or original)
  static async getEffectiveOrderStatus(order: any): Promise<string> {
    const localStatus = await this.getOrderStatus(order.id);
    return localStatus || order.status || order.orderStatus || 'Pending';
  }

  // Helper method to filter orders by status considering local overrides
  static async filterOrdersByStatus(orders: any[], targetStatus: string): Promise<any[]> {
    const filteredOrders = [];
    
    for (const order of orders) {
      const effectiveStatus = await this.getEffectiveOrderStatus(order);
      if (effectiveStatus.toLowerCase() === targetStatus.toLowerCase()) {
        filteredOrders.push({
          ...order,
          effectiveStatus
        });
      }
    }
    
    return filteredOrders;
  }
}
