// Debug utility to check API configuration
import { API_BASE_URL } from '../services/apiConfig';

export const debugApiConfig = () => {
  console.log('=== API Configuration Debug ===');
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('Current timestamp:', new Date().toISOString());
  console.log('================================');
};

// Test the ngrok connection
export const testNgrokConnection = async () => {
  try {
    console.log('Testing ngrok connection...');
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
        'Cache-Control': 'no-cache',
      },
    });
    
    console.log('Ngrok response status:', response.status);
    console.log('Ngrok response headers:', Object.fromEntries([...response.headers.entries()]));
    
    if (response.ok) {
      const text = await response.text();
      console.log('Ngrok connection successful:', text);
      return true;
    } else {
      console.log('Ngrok connection failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Ngrok connection error:', error);
    return false;
  }
};