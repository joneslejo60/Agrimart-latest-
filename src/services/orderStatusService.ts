// Order Status Service
// Service to fetch and manage order statuses from the API

import { API_BASE_URL, DEFAULT_HEADERS } from './apiConfig';

export interface OrderStatus {
  statusId: string;
  statusName: string;
}

export interface OrderStatusResponse {
  success: boolean;
  data?: OrderStatus[];
  error?: string;
}

// Cache for order statuses to avoid repeated API calls
let orderStatusCache: OrderStatus[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all order statuses from the API
 */
export const fetchOrderStatuses = async (): Promise<OrderStatusResponse> => {
  try {
    // Check cache first
    const now = Date.now();
    if (orderStatusCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return {
        success: true,
        data: orderStatusCache
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/OrderStatus`, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        // Note: Add Authorization header when implementing authentication
        // 'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OrderStatus[] = await response.json();
    
    // Update cache
    orderStatusCache = data;
    cacheTimestamp = now;

    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('Error fetching order statuses:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order statuses'
    };
  }
};

/**
 * Get order status name by ID
 */
export const getOrderStatusName = async (statusId: string): Promise<string> => {
  const result = await fetchOrderStatuses();
  
  if (!result.success || !result.data) {
    return 'Unknown';
  }

  const status = result.data.find(s => s.statusId === statusId);
  return status?.statusName || 'Unknown';
};

/**
 * Get order status ID by name
 */
export const getOrderStatusIdByName = async (statusName: string): Promise<string | null> => {
  const result = await fetchOrderStatuses();
  
  if (!result.success || !result.data) {
    return null;
  }

  const status = result.data.find(s => s.statusName.toLowerCase() === statusName.toLowerCase());
  return status?.statusId || null;
};

/**
 * Clear the order status cache (useful for testing or forced refresh)
 */
export const clearOrderStatusCache = (): void => {
  orderStatusCache = null;
  cacheTimestamp = 0;
};