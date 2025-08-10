// frontend/src/services/adminUtils.ts
// Utility functions for admin operations

import { adminApi } from './adminApiService';
import { ApiResponse } from './apiConfig';
import { ORDER_STATUS } from '../constants/orderStatus';

// ===== PRODUCT UTILITIES =====

export interface ProductStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalValue: number;
}

export const getProductStats = async (): Promise<ProductStats> => {
  const products = await adminApi.products.getAll();
  
  if (!products.success || !products.data) {
    return {
      totalProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      totalValue: 0,
    };
  }

  const stats: ProductStats = {
    totalProducts: products.data.length,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    totalValue: 0,
  };

  products.data.forEach(product => {
    // Stock analysis
    if (product.stockQuantity === 0) {
      stats.outOfStockProducts++;
    } else if (product.stockQuantity && product.minStockLevel && product.stockQuantity <= product.minStockLevel) {
      stats.lowStockProducts++;
    }

    // Status analysis
    if (product.isActive) {
      stats.activeProducts++;
    } else {
      stats.inactiveProducts++;
    }

    // Value calculation
    stats.totalValue += (product.price * (product.stockQuantity || 0));
  });

  return stats;
};

// ===== ORDER UTILITIES =====

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export const getOrderStats = async (): Promise<OrderStats> => {
  const orders = await adminApi.orders.getAllOrders();
  
  if (!orders.success || !orders.data) {
    return {
      totalOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    };
  }

  const stats: OrderStats = {
    totalOrders: orders.data.length,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  };

  // Import OrderStatusStorage for local status updates
  const { OrderStatusStorage } = await import('../utils/orderStatusStorage');

  // Process each order and consider effective status (local overrides + API status)
  for (const order of orders.data) {
    const effectiveStatus = await OrderStatusStorage.getEffectiveOrderStatus(order);
    
    // Status analysis using effective status (considering local updates)
    switch (effectiveStatus.toLowerCase()) {
      case 'pending':
      case 'new':
      case 'confirmed':
        stats.pendingOrders++;
        break;
      case 'processing':
        stats.processingOrders++;
        break;
      case 'delivered':
      case 'shipped':
        stats.completedOrders++;
        break;
      case 'cancelled':
      case 'refunded':
        stats.cancelledOrders++;
        break;
      default:
        // If we can't determine status, check original API status
        switch (order.orderStatusId) {
          case ORDER_STATUS.PENDING:
          case ORDER_STATUS.NEW:
            stats.pendingOrders++;
            break;
          case ORDER_STATUS.PROCESSING:
            stats.processingOrders++;
            break;
          case ORDER_STATUS.DELIVERED:
          case ORDER_STATUS.SHIPPED:
            stats.completedOrders++;
            break;
          case ORDER_STATUS.CANCELLED:
          case ORDER_STATUS.REFUNDED:
            stats.cancelledOrders++;
            break;
        }
        break;
    }

    // Revenue calculation
    stats.totalRevenue += order.totalAmount;
  }

  // Calculate average order value
  if (stats.totalOrders > 0) {
    stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
  }

  return stats;
};

// ===== USER UTILITIES =====

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
}

export const getUserStats = async (): Promise<UserStats> => {
  const users = await adminApi.users.getAllUsers();
  
  if (!users.success || !users.data) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      newUsersThisMonth: 0,
    };
  }

  const stats: UserStats = {
    totalUsers: users.data.length,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsersThisMonth: 0,
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  users.data.forEach(user => {
    // Status analysis
    if (user.isActive) {
      stats.activeUsers++;
    } else {
      stats.inactiveUsers++;
    }

    // New users this month
    if (user.dateJoined) {
      const joinDate = new Date(user.dateJoined);
      if (joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear) {
        stats.newUsersThisMonth++;
      }
    }
  });

  return stats;
};

// ===== INVENTORY UTILITIES =====

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  averageStockLevel: number;
}

export const getInventoryStats = async (): Promise<InventoryStats> => {
  const inventory = await adminApi.inventory.getInventory();
  
  if (!inventory.success || !inventory.data) {
    return {
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalInventoryValue: 0,
      averageStockLevel: 0,
    };
  }

  const stats: InventoryStats = {
    totalProducts: inventory.data.length,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryValue: 0,
    averageStockLevel: 0,
  };

  let totalStock = 0;

  inventory.data.forEach(item => {
    // Stock level analysis
    if (item.stockQuantity === 0) {
      stats.outOfStockCount++;
    } else if (item.minStockLevel && item.stockQuantity <= item.minStockLevel) {
      stats.lowStockCount++;
    }

    // Value calculation
    if (item.totalValue) {
    stats.totalInventoryValue += item.totalValue;
    }
    totalStock += item.stockQuantity;
  });

  // Calculate average stock level
  if (stats.totalProducts > 0) {
    stats.averageStockLevel = totalStock / stats.totalProducts;
  }

  return stats;
};

// ===== DASHBOARD UTILITIES =====

export interface DashboardData {
  productStats: ProductStats;
  orderStats: OrderStats;
  userStats: UserStats;
  inventoryStats: InventoryStats;
  recentOrders: any[];
  lowStockProducts: any[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
  try {
    const [productStats, orderStats, userStats, inventoryStats, orders, inventory] = await Promise.all([
      getProductStats(),
      getOrderStats(),
      getUserStats(),
      getInventoryStats(),
      adminApi.orders.getAllOrders(),
      adminApi.inventory.getInventory(),
    ]);

    // Get recent orders (last 10)
    const recentOrders = orders.success && orders.data ? orders.data.slice(-10).reverse() : [];

    // Get low stock products
    const lowStockProducts = inventory.success && inventory.data 
      ? inventory.data.filter(item => item.minStockLevel && item.stockQuantity <= item.minStockLevel && item.stockQuantity > 0)
      : [];

    return {
      productStats,
      orderStats,
      userStats,
      inventoryStats,
      recentOrders,
      lowStockProducts,
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // Return empty dashboard data
    return {
      productStats: await getProductStats(),
      orderStats: await getOrderStats(),
      userStats: await getUserStats(),
      inventoryStats: await getInventoryStats(),
      recentOrders: [],
      lowStockProducts: [],
    };
  }
};

// ===== BULK OPERATIONS =====

export const bulkUpdateProductStatus = async (productIds: number[], isActive: boolean): Promise<ApiResponse<void>> => {
  try {
    const results = await Promise.all(
      productIds.map(id => 
        adminApi.products.update(id, { isActive } as any)
      )
    );

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      return {
        success: false,
        error: `Failed to update ${failed.length} products`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk update failed',
    };
  }
};

export const bulkUpdateOrderStatus = async (orderIds: number[], statusId: number, notes?: string): Promise<ApiResponse<void>> => {
  try {
    const results = await Promise.all(
      orderIds.map(id => 
        adminApi.orders.updateOrderStatus(String(id), { statusId: String(statusId), notes })
      )
    );

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      return {
        success: false,
        error: `Failed to update ${failed.length} orders`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk update failed',
    };
  }
};

// ===== EXPORT UTILITIES =====

export const exportProductsToCSV = async (): Promise<string> => {
  const products = await adminApi.products.getAll();
  
  if (!products.success || !products.data) {
    throw new Error('Failed to fetch products');
  }

  const headers = ['ID', 'Name', 'Price', 'Stock', 'Category', 'Status'];
  const rows = products.data.map(product => [
    product.productId || '',
    product.name,
    product.price.toString(),
    product.stockQuantity?.toString() || '0',
    product.categoryId?.toString() || '',
    product.isActive ? 'Active' : 'Inactive',
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export const exportOrdersToCSV = async (): Promise<string> => {
  const orders = await adminApi.orders.getAllOrders();
  
  if (!orders.success || !orders.data) {
    throw new Error('Failed to fetch orders');
  }

  const headers = ['Order ID', 'User ID', 'Date', 'Total', 'Status', 'Payment Status'];
  const rows = orders.data.map(order => [
    order.id?.toString() || '', // Use 'id' or the correct identifier property
    order.userId?.toString() || '',
    order.orderDate,
    order.totalAmount?.toString() || '',
    order.statusName || order.orderStatusId?.toString() || '',
    order.paymentStatus || 'N/A',
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

// ===== VALIDATION UTILITIES =====

export const validateProduct = (product: any): string[] => {
  const errors: string[] = [];

  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!product.price || product.price <= 0) {
    errors.push('Product price must be greater than 0');
  }

  if (product.stockQuantity && product.stockQuantity < 0) {
    errors.push('Stock quantity cannot be negative');
  }

  if (product.minStockLevel && product.minStockLevel < 0) {
    errors.push('Minimum stock level cannot be negative');
  }

  if (product.maxStockLevel && product.minStockLevel && product.maxStockLevel < product.minStockLevel) {
    errors.push('Maximum stock level must be greater than minimum stock level');
  }

  return errors;
};

export const validateDeliveryRule = (rule: any): string[] => {
  const errors: string[] = [];

  if (rule.minOrderAmount < 0) {
    errors.push('Minimum order amount cannot be negative');
  }

  if (rule.maxOrderAmount < 0) {
    errors.push('Maximum order amount cannot be negative');
  }

  if (rule.minOrderAmount >= rule.maxOrderAmount) {
    errors.push('Minimum order amount must be less than maximum order amount');
  }

  if (rule.chargeAmount < 0) {
    errors.push('Charge amount cannot be negative');
  }

  return errors;
};

// Default export with all utilities
export default {
  getProductStats,
  getOrderStats,
  getUserStats,
  getInventoryStats,
  getDashboardData,
  bulkUpdateProductStatus,
  bulkUpdateOrderStatus,
  exportProductsToCSV,
  exportOrdersToCSV,
  validateProduct,
  validateDeliveryRule,
};