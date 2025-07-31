// frontend/src/services/apiEndpoints.ts
// Centralized API endpoints for AgriMart application

/**
 * API Endpoints Configuration
 * 
 * This file contains all API endpoints used throughout the application.
 * Organizing endpoints here makes it easier to maintain and update API URLs.
 */

// ===== AUTHENTICATION & OTP ENDPOINTS =====
export const AUTH_ENDPOINTS = {
  // OTP endpoints
  GENERATE_OTP: '/api/Otp/generate',
  VERIFY_OTP: '/api/Otp/verify',
  
  // Authentication endpoints
  LOGIN: '/api/Authentication/login',
  REGISTER: '/api/Authentication/register',
  CREATE_MANAGER: '/api/Authentication/create-manager',
} as const;

// ===== PRODUCT ENDPOINTS =====
export const PRODUCT_ENDPOINTS = {
  // General product endpoints
  GET_ALL: '/api/Products',
  GET_BY_ID: (id: string | number) => `/api/Products/${id}`,
  CREATE: '/api/Products',
  UPDATE: (id: string | number) => `/api/Products/${id}`,
  DELETE: (id: string | number) => `/api/Products/${id}`,
  
  // Product search and filtering
  SEARCH: '/api/Products/search',
  BY_CATEGORY: (categoryId: number) => `/api/Products/category/${categoryId}`,
} as const;

// ===== CATEGORY ENDPOINTS =====
export const CATEGORY_ENDPOINTS = {
  GET_ALL: '/api/Categories',
  GET_BY_ID: (id: number) => `/api/Categories/${id}`,
  CREATE: '/api/Categories',
  UPDATE: (id: number) => `/api/Categories/${id}`,
  DELETE: (id: number) => `/api/Categories/${id}`,
} as const;

// ===== CART ENDPOINTS =====
export const CART_ENDPOINTS = {
  // Main cart operations
  GET_CART: '/api/Cart',
  GET_USER_CART: (userId: string) => `/api/Cart?userId=${userId}`,
  ADD_TO_CART: '/api/Cart',
  UPDATE_CART: '/api/Cart',
  
  // Individual item operations
  UPDATE_ITEM_QUANTITY: (productId: string) => `/api/Cart/item/${productId}`,
  DELETE_ITEM: (productId: string) => `/api/Cart/${productId}`,
  
  // Cart management
  CLEAR_CART: '/api/Cart/clear',
  GET_CART_COUNT: '/api/Cart/count',
} as const;

// ===== ADDRESS ENDPOINTS =====
export const ADDRESS_ENDPOINTS = {
  // Address CRUD operations
  GET_ALL: '/api/Address',
  GET_BY_ID: (id: string) => `/api/Address/${id}`,
  GET_USER_ADDRESSES: (userId: string) => `/api/Address?userId=${userId}`,
  CREATE: '/api/Address',
  UPDATE: '/api/Address',
  DELETE: (id: string) => `/api/Address/${id}`,
  
  // Address management with pagination
  GET_PAGINATED: (pageNumber: number, pageSize: number) => 
    `/api/Address?pageNumber=${pageNumber}&pageSize=${pageSize}`,
} as const;

// ===== ORDER ENDPOINTS =====
export const ORDER_ENDPOINTS = {
  // Order CRUD operations
  GET_ALL: '/api/Orders',
  GET_BY_ID: (id: number) => `/api/Orders/${id}`,
  CREATE: '/api/Orders',
  UPDATE: (id: number) => `/api/Orders/${id}`,
  DELETE: (id: number) => `/api/Orders/${id}`,
  
  // Order management
  GET_USER_ORDERS: (userId: string) => `/api/Orders/user/${userId}`,
  UPDATE_STATUS: (id: number) => `/api/Orders/${id}/status`,
  CANCEL_ORDER: (id: number) => `/api/Orders/${id}/cancel`,
  
  // Order items
  GET_ORDER_ITEMS: (orderId: number) => `/api/Orders/${orderId}/items`,
} as const;

// ===== USER PROFILE ENDPOINTS =====
export const USER_ENDPOINTS = {
  // Profile management
  GET_PROFILE: (userId: string) => `/api/UserProfiles/${userId}`,
  GET_BY_ID: (id: string) => `/api/UserProfiles/${id}`,
  UPDATE_PROFILE: (userId: string) => `/api/UserProfiles/${userId}`,
  DELETE_PROFILE: (id: string) => `/api/UserProfiles/${id}`,
  
  // User authentication status
  GET_AUTH_STATUS: '/api/UserProfiles/auth-status',
  REFRESH_TOKEN: '/api/UserProfiles/refresh-token',
} as const;

// ===== ADMIN PRODUCT MANAGEMENT ENDPOINTS =====
export const ADMIN_PRODUCT_ENDPOINTS = {
  // Manager product operations
  GET_ALL: '/api/Manager/products',
  GET_BY_ID: (id: string | number) => `/api/Manager/products/${id}`,
  CREATE: '/api/Manager/products',
  UPDATE: (id: string | number) => `/api/Manager/products/${id}`,
  DELETE: (id: string | number) => `/api/Manager/products/${id}`,
  
  // Stock management
  UPDATE_UNITS: (id: string | number, quantity: number) => 
    `/api/Manager/products/${id}/units?quantity=${quantity}`,
} as const;

// ===== ADMIN INVENTORY ENDPOINTS =====
export const ADMIN_INVENTORY_ENDPOINTS = {
  GET_INVENTORY: '/api/Manager/inventory',
  UPDATE_STOCK: (productId: string) => `/api/Manager/inventory/${productId}`,
  GET_LOW_STOCK: '/api/Manager/inventory/low-stock',
  GET_OUT_OF_STOCK: '/api/Manager/inventory/out-of-stock',
} as const;

// ===== ADMIN USER MANAGEMENT ENDPOINTS =====
export const ADMIN_USER_ENDPOINTS = {
  // User management
  GET_ALL_USERS: '/api/Manager/UserProfiles',
  GET_USER_BY_ID: (id: string) => `/api/Manager/UserProfiles/${id}`,
  UPDATE_USER: (id: string) => `/api/Manager/UserProfiles/${id}`,
  DELETE_USER: (id: string) => `/api/Manager/UserProfiles/${id}`,
  
  // Regular user profiles (non-admin)
  GET_CUSTOMER_PROFILES: '/api/UserProfiles',
  UPDATE_CUSTOMER: (id: number) => `/api/UserProfiles/${id}`,
  DELETE_CUSTOMER: (id: number) => `/api/UserProfiles/${id}`,
} as const;

// ===== ADMIN ORDER MANAGEMENT ENDPOINTS =====
export const ADMIN_ORDER_ENDPOINTS = {
  GET_ALL_ORDERS: '/api/Orders',
  GET_ORDER_BY_ID: (id: number) => `/api/Orders/${id}`,
  UPDATE_ORDER_STATUS: (id: number) => `/api/Orders/${id}/status`,
  GET_ORDER_STATISTICS: '/api/Orders/statistics',
  GET_ORDERS_BY_STATUS: (statusId: number) => `/api/Orders/status/${statusId}`,
} as const;

// ===== DELIVERY CHARGE ENDPOINTS =====
export const DELIVERY_ENDPOINTS = {
  GET_ALL_RULES: '/api/DeliveryChargeRules',
  GET_RULE_BY_ID: (id: number) => `/api/DeliveryChargeRules/${id}`,
  CREATE_RULE: '/api/DeliveryChargeRules',
  UPDATE_RULE: (id: number) => `/api/DeliveryChargeRules/${id}`,
  DELETE_RULE: (id: number) => `/api/DeliveryChargeRules/${id}`,
  
  // Calculate delivery charges
  CALCULATE_CHARGE: '/api/DeliveryChargeRules/calculate',
} as const;

// ===== CMS (Content Management System) ENDPOINTS =====
export const CMS_ENDPOINTS = {
  GET_BY_SLUG: (slug: string) => `/api/CmsPage/by-slug/${slug}`,
  CREATE_PAGE: '/api/CmsPage',
  UPDATE_PAGE: (id: number) => `/api/CmsPage/${id}`,
  DELETE_PAGE: (id: number) => `/api/CmsPage/${id}`,
  GET_ALL_PAGES: '/api/CmsPage',
} as const;

// ===== NOTIFICATION ENDPOINTS =====
export const NOTIFICATION_ENDPOINTS = {
  GET_ALL: '/api/Notifications',
  GET_BY_ID: (id: number) => `/api/Notifications/${id}`,
  CREATE: '/api/Notifications',
  UPDATE: (id: number) => `/api/Notifications/${id}`,
  DELETE: (id: number) => `/api/Notifications/${id}`,
  
  // User-specific notifications
  GET_USER_NOTIFICATIONS: (userId: string) => `/api/Notifications/user/${userId}`,
  MARK_AS_READ: (id: number) => `/api/Notifications/${id}/read`,
  MARK_ALL_AS_READ: (userId: string) => `/api/Notifications/user/${userId}/read-all`,
} as const;

// ===== ANALYTICS & REPORTING ENDPOINTS =====
export const ANALYTICS_ENDPOINTS = {
  // Sales analytics
  SALES_SUMMARY: '/api/Analytics/sales-summary',
  PRODUCT_PERFORMANCE: '/api/Analytics/product-performance',
  USER_ACTIVITY: '/api/Analytics/user-activity',
  
  // Reports
  DAILY_SALES: (date: string) => `/api/Analytics/daily-sales/${date}`,
  MONTHLY_SALES: (year: number, month: number) => `/api/Analytics/monthly-sales/${year}/${month}`,
  TOP_PRODUCTS: '/api/Analytics/top-products',
  TOP_CUSTOMERS: '/api/Analytics/top-customers',
} as const;

// ===== EXTERNAL SERVICE ENDPOINTS =====
export const EXTERNAL_ENDPOINTS = {
  // Weather service
  WEATHER_DATA: '/api/External/weather',
  
  // Geocoding service
  GEOCODE: '/api/External/geocode',
  REVERSE_GEOCODE: '/api/External/reverse-geocode',
  
  // Translation service
  TRANSLATE: '/api/External/translate',
} as const;

// ===== UTILITY ENDPOINTS =====
export const UTILITY_ENDPOINTS = {
  // Health check
  HEALTH_CHECK: '/api/Health',
  
  // App version and updates
  VERSION_CHECK: '/api/Utility/version',
  
  // File upload
  UPLOAD_IMAGE: '/api/Utility/upload/image',
  UPLOAD_FILE: '/api/Utility/upload/file',
  
  // Configuration
  GET_APP_CONFIG: '/api/Utility/config',
} as const;

// ===== GROUPED ENDPOINTS FOR EASY ACCESS =====
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  PRODUCTS: PRODUCT_ENDPOINTS,
  CATEGORIES: CATEGORY_ENDPOINTS,
  CART: CART_ENDPOINTS,
  ADDRESSES: ADDRESS_ENDPOINTS,
  ORDERS: ORDER_ENDPOINTS,
  USERS: USER_ENDPOINTS,
  NOTIFICATIONS: NOTIFICATION_ENDPOINTS,
  
  // Admin endpoints
  ADMIN: {
    PRODUCTS: ADMIN_PRODUCT_ENDPOINTS,
    INVENTORY: ADMIN_INVENTORY_ENDPOINTS,
    USERS: ADMIN_USER_ENDPOINTS,
    ORDERS: ADMIN_ORDER_ENDPOINTS,
  },
  
  // Other services
  DELIVERY: DELIVERY_ENDPOINTS,
  CMS: CMS_ENDPOINTS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
  EXTERNAL: EXTERNAL_ENDPOINTS,
  UTILITY: UTILITY_ENDPOINTS,
} as const;

// ===== HELPER FUNCTIONS =====

/**
 * Helper function to build endpoint with query parameters
 * @param baseEndpoint - The base endpoint URL
 * @param params - Query parameters as key-value pairs
 * @returns Complete endpoint URL with query parameters
 */
export const buildEndpointWithParams = (
  baseEndpoint: string, 
  params: Record<string, string | number | boolean>
): string => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;
};

/**
 * Helper function to build paginated endpoint
 * @param baseEndpoint - The base endpoint URL
 * @param pageNumber - Page number (default: 1)
 * @param pageSize - Page size (default: 10)
 * @param additionalParams - Additional query parameters
 * @returns Paginated endpoint URL
 */
export const buildPaginatedEndpoint = (
  baseEndpoint: string,
  pageNumber: number = 1,
  pageSize: number = 10,
  additionalParams?: Record<string, string | number | boolean>
): string => {
  const params = {
    pageNumber,
    pageSize,
    ...additionalParams,
  };
  
  return buildEndpointWithParams(baseEndpoint, params);
};

// Default export
export default API_ENDPOINTS;

// ===== EXAMPLE USAGE =====
/*
// Import the endpoints in your service files:

import { API_ENDPOINTS } from './apiEndpoints';

// Use in your API service:
const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, 'POST', loginData);

// Use with parameters:
const userOrders = await apiRequest(API_ENDPOINTS.ORDERS.GET_USER_ORDERS('user123'));

// Use with query parameters:
const paginatedAddresses = buildPaginatedEndpoint(
  API_ENDPOINTS.ADDRESSES.GET_ALL,
  1,
  20,
  { userId: 'user123' }
);

// Access nested admin endpoints:
const inventory = await apiRequest(API_ENDPOINTS.ADMIN.INVENTORY.GET_INVENTORY);
*/