// frontend/src/services/userService.ts

import { ApiResponse } from './apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// User data interface
export interface User {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  profilePicture?: string;
  role?: string; // Added role property
}

// Storage keys
const USER_STORAGE_KEY = '@AgriMart:user';
const AUTH_TOKEN_KEY = '@AgriMart:authToken';

/**
 * Save user data to local storage
 * @param user User data to save
 */
export const saveUser = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    console.log('User data saved successfully');
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

/**
 * Get user data from local storage
 * @returns User data or null if not found
 */
export const getUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (userData) {
      return JSON.parse(userData) as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Save authentication token
 * @param token Authentication token
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    console.log('Auth token saved successfully');
  } catch (error) {
    console.error('Error saving auth token:', error);
    throw error;
  }
};

/**
 * Get authentication token
 * @returns Authentication token or null if not found
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Clear user data and authentication token (logout)
 */
export const clearUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([USER_STORAGE_KEY, AUTH_TOKEN_KEY]);
    console.log('User data cleared successfully');
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated
 * @returns True if user is authenticated, false otherwise
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getUser();
  const token = await getAuthToken();
  return !!user && !!token;
};

/**
 * Update user profile
 * @param userData User data to update
 */
export const updateUserProfile = async (userData: Partial<User>): Promise<ApiResponse<User>> => {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Update user data
    const updatedUser: User = {
      ...currentUser,
      ...userData,
    };

    // Save updated user data
    await saveUser(updatedUser);

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error('Error updating user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: errorMessage };
  }
};

/**
 * Fetch current user info from /api/Authentication/me and save to AsyncStorage
 * @returns User data or null if failed
 */
export const fetchCurrentUserFromApi = async (): Promise<User | null> => {
  try {
    // Import apiRequest here to avoid circular dependency
    const { apiRequest } = await import('./apiCore');
    const response = await apiRequest<null, any>('/api/Authentication/me', 'GET');
    if (response.success && response.data) {
      // Map API response to User interface if needed
      const user: User = {
        id: response.data.userId != null ? response.data.userId.toString() : 
            response.data.id != null ? response.data.id.toString() : 
            '0', // Use '0' as fallback instead of empty string
        phoneNumber: response.data.phoneNumber || '',
        name: response.data.name,
        email: response.data.email,
        profilePicture: response.data.profilePicture,
        role: response.data.role, // Add role from API response
      };
      await saveUser(user);
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error fetching current user from /api/Authentication/me:', error);
    return null;
  }
};

export default {
  saveUser,
  getUser,
  saveAuthToken,
  getAuthToken,
  clearUserData,
  isAuthenticated,
  updateUserProfile,
  fetchCurrentUserFromApi,
};