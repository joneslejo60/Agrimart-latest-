# API Services Usage Guide

This document explains how to use the updated API services in your AgriMart application with the new admin endpoints.

## Overview

The API services are now organized into:
- **Main API Service** (`apiService.ts`) - Core customer-facing endpoints
- **Admin API Service** (`adminApiService.ts`) - Admin/Manager specific endpoints
- **API Core** (`apiCore.ts`) - Core HTTP request handling
- **API Config** (`apiConfig.ts`) - Configuration settings

## Import Usage

### For Customer-facing Features
```typescript
import apiService from '../services/apiService';

// Authentication
const result = await apiService.auth.login(email, password);

// Products
const products = await apiService.products.getAll();

// Cart operations
const cartResult = await apiService.cart.addToCart(productId, quantity);

// Orders
const orders = await apiService.order.getUserOrders(userId);
```

### For Admin Features
```typescript
import { adminApi } from '../services/adminApiService';
// OR
import apiService from '../services/apiService';
const adminApi = apiService.admin;

// Product management
const products = await adminApi.products.getAll();
const product = await adminApi.products.create(productData);

// User management
const users = await adminApi.users.getAllUsers();
const result = await adminApi.users.updateUser(userId, userData);

// Order management
const orders = await adminApi.orders.getAllOrders();
const result = await adminApi.orders.updateOrderStatus(orderId, statusData);
```

## Available Admin Endpoints

### Product Management
```typescript
// Get all products
const products = await adminApi.products.getAll();

// Create product
const newProduct = await adminApi.products.create({
  name: "New Product",
  description: "Product description",
  price: 29.99,
  stockQuantity: 100,
  categoryId: 1
});

// Update product
const updatedProduct = await adminApi.products.update(productId, productData);

// Delete product
await adminApi.products.delete(productId);

// Update stock
await adminApi.products.updateUnits(productId, newQuantity);
```

### Inventory Management
```typescript
// Get inventory overview
const inventory = await adminApi.inventory.getInventory();
```

### User Management
```typescript
// Get all users
const users = await adminApi.users.getAllUsers();

// Update user
const updatedUser = await adminApi.users.updateUser(userId, {
  name: "Updated Name",
  email: "updated@email.com",
  phoneNumber: "1234567890",
  isActive: true
});

// Delete user
await adminApi.users.deleteUser(userId);
```

### Order Management
```typescript
// Get all orders
const orders = await adminApi.orders.getAllOrders();

// Get specific order
const order = await adminApi.orders.getOrderById(orderId);

// Update order status
await adminApi.orders.updateOrderStatus(orderId, {
  statusId: 2,
  notes: "Order shipped"
});
```

### Delivery Charge Rules
```typescript
// Get all rules
const rules = await adminApi.deliveryChargeRules.getAll();

// Create rule
const newRule = await adminApi.deliveryChargeRules.create({
  minOrderAmount: 0,
  maxOrderAmount: 50,
  chargeAmount: 5.99,
  isActive: true
});

// Update rule
await adminApi.deliveryChargeRules.update(ruleId, ruleData);

// Delete rule
await adminApi.deliveryChargeRules.delete(ruleId);
```

### CMS Management
```typescript
// Get page by slug
const page = await adminApi.cms.getBySlug("about-us");

// Create page
const newPage = await adminApi.cms.create({
  title: "New Page",
  slug: "new-page",
  content: "Page content",
  isActive: true
});

// Update page
await adminApi.cms.update(pageId, pageData);

// Delete page
await adminApi.cms.delete(pageId);
```

### Categories Management
```typescript
// Get all categories
const categories = await adminApi.categories.getAll();

// Create category
const newCategory = await adminApi.categories.create({
  name: "New Category",
  description: "Category description"
});

// Update category
await adminApi.categories.update(categoryId, categoryData);

// Delete category
await adminApi.categories.delete(categoryId);
```

### Notifications Management
```typescript
// Get all notifications
const notifications = await adminApi.notifications.getAll();

// Create notification
const newNotification = await adminApi.notifications.create({
  userId: "user-uuid",
  message: "Your order has been shipped",
  isRead: false
});

// Update notification
await adminApi.notifications.update(notificationId, notificationData);

// Delete notification
await adminApi.notifications.delete(notificationId);
```

## Error Handling

All API functions return a response object with the following structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  _isLocalFallback?: boolean;
}
```

Example usage:
```typescript
const result = await adminApi.products.getAll();

if (result.success) {
  // Handle success
  console.log('Products:', result.data);
} else {
  // Handle error
  console.error('Error:', result.error);
}
```

## Authentication

All admin endpoints require authentication. Make sure the user is logged in and has the appropriate permissions before calling admin endpoints.

## Example Admin Screen Usage

```typescript
// AdminProductsScreen.tsx
import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/adminApiService';

const AdminProductsScreen = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const result = await adminApi.products.getAll();
      if (result.success) {
        setProducts(result.data);
      } else {
        console.error('Failed to load products:', result.error);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: number) => {
    try {
      const result = await adminApi.products.delete(productId);
      if (result.success) {
        // Refresh the products list
        loadProducts();
      } else {
        console.error('Failed to delete product:', result.error);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // ... rest of component
};
```

## Notes

- All endpoints follow RESTful conventions
- Data validation is handled by the API server
- Make sure to handle loading states and errors appropriately
- The admin API endpoints are organized by functionality for better maintainability
- Always check the `success` property of the response before accessing `data`
- Use TypeScript interfaces for better type safety