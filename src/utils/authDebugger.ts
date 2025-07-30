// Authentication Debugger for Farming App
// This utility helps debug authentication issues

import { getAuthToken, getUser } from '../services/userService';
import { API_BASE_URL } from '../services/apiConfig';

export interface AuthDebugInfo {
  hasToken: boolean;
  tokenPreview?: string;
  tokenExpiry?: string;
  user?: any;
  apiBaseUrl: string;
  timestamp: string;
}

export const debugAuth = async (): Promise<AuthDebugInfo> => {
  console.log('🔍 === AUTHENTICATION DEBUG START ===');
  
  const token = await getAuthToken();
  const user = await getUser();
  
  const debugInfo: AuthDebugInfo = {
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : undefined,
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role
    } : undefined,
    apiBaseUrl: API_BASE_URL,
    timestamp: new Date().toISOString()
  };

  // Try to decode JWT token to check expiry
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      debugInfo.tokenExpiry = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Unknown';
      
      console.log('🔍 Token payload:', payload);
    } catch (error) {
      console.warn('🔍 Could not decode JWT token:', error);
    }
  }

  console.log('🔍 AUTH DEBUG INFO:', debugInfo);
  console.log('🔍 === AUTHENTICATION DEBUG END ===');
  
  return debugInfo;
};

// Test specific API endpoint with current auth
export const testApiEndpoint = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any) => {
  console.log(`🔍 Testing API endpoint: ${method} ${endpoint}`);
  
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`🔍 Using auth token: ${token.substring(0, 20)}...`);
  } else {
    console.log('🔍 No auth token available');
  }
  
  try {
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    console.log(`🔍 Response status: ${response.status} ${response.statusText}`);
    console.log(`🔍 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`🔍 Error response:`, errorText);
      return {
        success: false,
        status: response.status,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      };
    }
    
    const data = await response.json();
    console.log(`🔍 Success response:`, data);
    
    return {
      success: true,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
    
  } catch (error) {
    console.error(`🔍 API test failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Test cart API specifically
export const testCartApi = async () => {
  console.log('🔍 === TESTING CART API ===');
  
  await debugAuth();
  
  // Test GET cart
  const getResult = await testApiEndpoint('/api/Cart', 'GET');
  console.log('🔍 GET /api/Cart result:', getResult);
  
  // Test POST cart (add item)
  const postResult = await testApiEndpoint('/api/Cart', 'POST', {
    productId: 'test-product-id',
    quantity: 1
  });
  console.log('🔍 POST /api/Cart result:', postResult);
  
  return { getResult, postResult };
};