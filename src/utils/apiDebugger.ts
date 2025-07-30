// frontend/src/utils/apiDebugger.ts
import { API_BASE_URL } from '../services/apiConfig';
import userService from '../services/userService';

/**
 * Utility function to debug API connection issues
 * This can be called from any screen to check API connectivity
 */
export async function debugApiConnection(): Promise<string> {
  try {
    console.log('=== API Connection Debugger ===');
    console.log(`Base URL: ${API_BASE_URL}`);
    
    // Check if we have an auth token
    const token = await userService.getAuthToken();
    console.log(`Auth Token: ${token ? 'Present' : 'Not found'}`);
    if (token) {
      console.log(`Token preview: ${token.substring(0, 15)}...`);
    }
    
    // Try a simple fetch to the API
    console.log('Testing API connection...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`API response status: ${response.status}`);
      if (response.ok) {
        const text = await response.text();
        console.log(`API response: ${text}`);
        return 'API connection successful';
      } else {
        return `API connection failed with status: ${response.status}`;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', fetchError);
      return `API fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
    }
  } catch (error) {
    console.error('Debug error:', error);
    return `Debug error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Utility function to test the API with the current token
 */
export async function testApiWithToken(): Promise<string> {
  try {
    const token = await userService.getAuthToken();
    if (!token) {
      return 'No auth token found';
    }
    
    console.log('Testing API with token...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/UserProfiles/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`API auth test status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log('User profile data:', data);
        return 'Authentication successful';
      } else {
        const text = await response.text();
        console.error('Auth error response:', text);
        return `Authentication failed with status: ${response.status}`;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Auth test error:', fetchError);
      return `Auth test error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
    }
  } catch (error) {
    console.error('Auth test error:', error);
    return `Auth test error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export default {
  debugApiConnection,
  testApiWithToken
};