// frontend/src/services/apiConfig.ts

export const API_BASE_URL = 'https://85902288bdea.ngrok-free.app'; // Updated to use new ngrok tunnel

// API request timeout in milliseconds
export const TIMEOUT_MS = 60000; // Increased to 60 seconds for ngrok connections

// Maximum number of retries for API requests
export const MAX_RETRIES = 3; // Increased retries for potentially unstable connections

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'ngrok-skip-browser-warning': 'true',
  'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
  'Cache-Control': 'no-cache',
};

// Generic API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: string;
  _isLocalFallback?: boolean; // Added for our special 500 error handling
  clientSubmissionId?: string; // For tracking client-side submissions
}