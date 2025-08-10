// frontend/src/services/adminApiService.ts
// Admin-specific API endpoints for AgriMart

import { apiRequest } from './apiCore';
import { Product, UserProfile } from './apiService';
import { API_ENDPOINTS } from './apiEndpoints';

// ===== ADMIN INTERFACES =====

export interface UpdateOrderStatusRequest {
  statusId: string; // Changed to string for GUID
  notes?: string;
}

export interface AdminUserProfile {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  isActive?: boolean;
  dateJoined?: string;
  lastLogin?: string;
  passwordHash?: string;
  role?: string;
}

export interface InventoryItem {
  productId: string;
  name: string;                    // API returns "name" not "productName"
  description?: string;
  price: number;                   // API returns "price" not "unitCost"
  stockQuantity: number;           // API returns "stockQuantity" not "currentStock"
  categoryId: number;
  imageUrl?: string | null;
  isActive: boolean;
  createdDate: string;
  modifiedDate?: string | null;
  // Optional fields for enhanced inventory management
  categoryName?: string;
  reservedStock?: number;
  availableStock?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  lastRestocked?: string;
  unitCost?: number;
  totalValue?: number;
}

export interface AdminOrder {
  id: string; // GUID string for order ID
  userId: string; // GUID string for user ID
  userName?: string;
  userEmail?: string;
  orderDate: string;
  totalAmount: number;
  orderStatusId: string; // GUID string for status ID
  statusName?: string;
  shippingAddressId: number;
  trackingNumber?: string | null;
  createdDate: string;
  modifiedDate?: string | null;
  paymentStatus?: string;
  notes?: string;
  orderItems?: AdminOrderItem[];
}

export interface AdminOrderItem {
  orderItemId: string; // GUID string for order item ID
  orderId: string; // GUID string for order ID
  productId: string; // GUID string for product ID
  productName: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  totalPrice?: number;
}

export interface DeliveryChargeRule {
  ruleId?: number;
  minOrderAmount: number;
  maxOrderAmount: number;
  chargeAmount: number;
  isActive: boolean;
}

export interface AdminProduct {
  productId?: number | string;
  name: string;
  description?: string;
  price: number;
  stockQuantity?: number;
  imageUrl?: string;
  categoryId?: number;
  unitOfMeasure?: string;
  isActive?: boolean;
  createdDate?: string;
  modifiedDate?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  unitCost?: number;
}

// ===== ADMIN PRODUCT MANAGEMENT =====

export const adminProductsApi = {
  // Get all products with admin privileges
  getAll: () => {
    return apiRequest<null, AdminProduct[]>(API_ENDPOINTS.PRODUCTS.GET_ALL, 'GET');
  },
  
  // Create a new product
  create: (product: Omit<AdminProduct, 'productId'>) => {
    // Add required date fields for backend
    const productWithDates = {
      ...product,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };
    
    return apiRequest<any, AdminProduct>(API_ENDPOINTS.ADMIN.PRODUCTS.CREATE, 'POST', productWithDates);
  },
  
  // Get product by ID
  getById: (id: number | string) => {
    return apiRequest<null, AdminProduct>(API_ENDPOINTS.ADMIN.PRODUCTS.GET_BY_ID(id), 'GET');
  },
  
  // Update product
  update: (id: number | string, product: AdminProduct) => {
    return apiRequest<AdminProduct, AdminProduct>(API_ENDPOINTS.ADMIN.PRODUCTS.UPDATE(id), 'PUT', product);
  },
  
  // Delete product
  delete: (id: number | string) => {
    return apiRequest<null, void>(API_ENDPOINTS.ADMIN.PRODUCTS.DELETE(id), 'DELETE');
  },
  
  // Update product stock/units
  updateUnits: (id: number | string, quantity: number) => {
    return apiRequest<null, void>(API_ENDPOINTS.ADMIN.PRODUCTS.UPDATE_UNITS(id, quantity), 'PUT');
  },
};

// ===== ADMIN INVENTORY MANAGEMENT =====

export const adminInventoryApi = {
  // Get inventory overview  
  getInventory: () => {
    return apiRequest<null, InventoryItem[]>(API_ENDPOINTS.ADMIN.INVENTORY.GET_INVENTORY, 'GET');
  },
};

// ===== ADMIN USER MANAGEMENT =====

export const adminUserApi = {
  // Get all user profiles
  getAllUsers: () => {
    return apiRequest<null, AdminUserProfile[]>(API_ENDPOINTS.ADMIN.USERS.GET_ALL_USERS, 'GET');
  },
  
  // Get a single user profile by ID (more efficient)
  getUserById: (userId: string) => {
    console.log('🔍 getUserById - Fetching user with ID:', userId);
    // This assumes your backend supports fetching a single user profile by ID.
    // If not, the previous implementation is a fallback, but this is the correct approach.
    return apiRequest<null, AdminUserProfile>(API_ENDPOINTS.ADMIN.USERS.GET_USER_BY_ID(userId), 'GET');
  },
  
  // Update user profile (customer) - Corrected to use string for userId
  updateUser: (userId: string, userProfile: AdminUserProfile) => {
    // The endpoint for updating a general user profile should be used.
    // The distinction between 'customer' and 'manager' seems to be causing type issues.
    // Using a consistent endpoint for user updates simplifies the logic.
    return apiRequest<AdminUserProfile, AdminUserProfile>(API_ENDPOINTS.ADMIN.USERS.UPDATE_USER(userId), 'PUT', userProfile);
  },

  // Update manager/admin user profile
  updateManagerUser: (userId: string, userProfile: AdminUserProfile) => {
    // Send the UserProfile object directly with all required fields
    const payload = {
      ...userProfile,
      userId: userId,
      passwordHash: userProfile.passwordHash || "", // Required field
      role: userProfile.role || "Manager" // Required field
    };
    console.log('🔍 updateManagerUser - Sending payload:', JSON.stringify(payload, null, 2));
    return apiRequest<any, AdminUserProfile>(API_ENDPOINTS.ADMIN.USERS.UPDATE_USER(userId), 'PUT', payload);
  },
  
  // Delete user profile - Corrected to use string for userId
  deleteUser: (userId: string) => {
    return apiRequest<null, void>(API_ENDPOINTS.ADMIN.USERS.DELETE_USER(userId), 'DELETE');
  },
};

// ===== ADMIN ORDER MANAGEMENT =====

export const adminOrderApi = {
  // Get all orders
  getAllOrders: () => {
    return apiRequest<null, AdminOrder[]>(API_ENDPOINTS.ADMIN.ORDERS.GET_ALL_ORDERS, 'GET');
  },
  
  // Get order by ID
  getOrderById: (id: string) => {
    return apiRequest<null, AdminOrder>(API_ENDPOINTS.ADMIN.ORDERS.GET_ORDER_BY_ID(id), 'GET');
  },
  
  // Update order status
  updateOrderStatus: (id: string, statusRequest: UpdateOrderStatusRequest) => {
    return apiRequest<UpdateOrderStatusRequest, void>(API_ENDPOINTS.ADMIN.ORDERS.UPDATE_ORDER_STATUS(id), 'PUT', statusRequest);
  },
};

// ===== ADMIN DELIVERY CHARGE RULES =====

export const adminDeliveryChargeApi = {
  // Get all delivery charge rules
  getAll: () => {
    return apiRequest<null, DeliveryChargeRule[]>(API_ENDPOINTS.DELIVERY.GET_ALL_RULES, 'GET');
  },
  
  // Create delivery charge rule
  create: (rule: Omit<DeliveryChargeRule, 'ruleId'>) => {
    return apiRequest<Omit<DeliveryChargeRule, 'ruleId'>, DeliveryChargeRule>(API_ENDPOINTS.DELIVERY.CREATE_RULE, 'POST', rule);
  },
  
  // Update delivery charge rule
  update: (id: number, rule: DeliveryChargeRule) => {
    return apiRequest<DeliveryChargeRule, DeliveryChargeRule>(API_ENDPOINTS.DELIVERY.UPDATE_RULE(id), 'PUT', rule);
  },
  
  // Delete delivery charge rule
  delete: (id: number) => {
    return apiRequest<null, void>(API_ENDPOINTS.DELIVERY.DELETE_RULE(id), 'DELETE');
  },
};

// ===== ADMIN CMS MANAGEMENT =====

export interface AdminCMSPage {
  cmsPageId?: number;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
}

export const adminCMSApi = {
  // Get page by slug
  getBySlug: (slug: string) => {
    return apiRequest<null, AdminCMSPage>(API_ENDPOINTS.CMS.GET_BY_SLUG(slug), 'GET');
  },
  
  // Create CMS page
  create: (page: Omit<AdminCMSPage, 'cmsPageId'>) => {
    return apiRequest<Omit<AdminCMSPage, 'cmsPageId'>, AdminCMSPage>(API_ENDPOINTS.CMS.CREATE_PAGE, 'POST', page);
  },
  
  // Update CMS page
  update: (id: number, page: AdminCMSPage) => {
    return apiRequest<AdminCMSPage, AdminCMSPage>(API_ENDPOINTS.CMS.UPDATE_PAGE(id), 'PUT', page);
  },
  
  // Delete CMS page
  delete: (id: number) => {
    return apiRequest<null, void>(API_ENDPOINTS.CMS.DELETE_PAGE(id), 'DELETE');
  },
};

// ===== ADMIN CATEGORIES MANAGEMENT =====

export interface AdminCategory {
  id?: number;
  name: string;
  description?: string;
}

export const adminCategoriesApi = {
  // Get all categories
  getAll: () => {
    return apiRequest<null, AdminCategory[]>(API_ENDPOINTS.CATEGORIES.GET_ALL, 'GET');
  },
  
  // Get category by ID
  getById: (id: number) => {
    return apiRequest<null, AdminCategory>(API_ENDPOINTS.CATEGORIES.GET_BY_ID(id), 'GET');
  },
  
  // Create category
  create: (category: Omit<AdminCategory, 'id'>) => {
    return apiRequest<Omit<AdminCategory, 'id'>, AdminCategory>(API_ENDPOINTS.CATEGORIES.CREATE, 'POST', category);
  },
  
  // Update category
  update: (id: number, category: AdminCategory) => {
    return apiRequest<AdminCategory, AdminCategory>(API_ENDPOINTS.CATEGORIES.UPDATE(id), 'PUT', category);
  },
  
  // Delete category
  delete: (id: number) => {
    return apiRequest<null, void>(API_ENDPOINTS.CATEGORIES.DELETE(id), 'DELETE');
  },
};

// ===== ADMIN NOTIFICATIONS MANAGEMENT =====

export interface AdminNotification {
  notificationId?: number;
  userId: string;
  message: string;
  dateSent?: string;
  isRead: boolean;
}

export const adminNotificationsApi = {
  // Get all notifications
  getAll: () => {
    return apiRequest<null, AdminNotification[]>(API_ENDPOINTS.NOTIFICATIONS.GET_ALL, 'GET');
  },
  
  // Get notification by ID
  getById: (id: number) => {
    return apiRequest<null, AdminNotification>(API_ENDPOINTS.NOTIFICATIONS.GET_BY_ID(id), 'GET');
  },
  
  // Create notification
  create: (notification: Omit<AdminNotification, 'notificationId'>) => {
    return apiRequest<Omit<AdminNotification, 'notificationId'>, AdminNotification>(API_ENDPOINTS.NOTIFICATIONS.CREATE, 'POST', notification);
  },
  
  // Update notification
  update: (id: number, notification: AdminNotification) => {
    return apiRequest<AdminNotification, AdminNotification>(API_ENDPOINTS.NOTIFICATIONS.UPDATE(id), 'PUT', notification);
  },
  
  // Delete notification
  delete: (id: number) => {
    return apiRequest<null, void>(API_ENDPOINTS.NOTIFICATIONS.DELETE(id), 'DELETE');
  },
};

// ===== MAIN ADMIN API EXPORT =====

export const adminApi = {
  products: adminProductsApi,
  inventory: adminInventoryApi,
  users: adminUserApi,
  orders: adminOrderApi,
  deliveryChargeRules: adminDeliveryChargeApi,
  cms: adminCMSApi,
  categories: adminCategoriesApi,
  notifications: adminNotificationsApi,
};

// Default export
export default adminApi;