// frontend/src/services/settingsService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// Storage keys
const NOTIFICATIONS_ENABLED_KEY = '@AgriMart:notificationsEnabled';
const LOCATION_ENABLED_KEY = '@AgriMart:locationEnabled';

/**
 * Get notification settings
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return false;
  }
}

/**
 * Save notification settings
 */
export async function saveNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log('Notification settings saved successfully');
    
    // Here you would typically register or unregister for push notifications
    // This would depend on the push notification service you're using
    if (enabled) {
      // Request notification permissions if enabled
      // This is a placeholder - you would implement this with a push notification library
      console.log('Would register for push notifications here');
    } else {
      // Unregister from push notifications if disabled
      console.log('Would unregister from push notifications here');
    }
  } catch (error) {
    console.error('Error saving notification settings:', error);
    throw error;
  }
}

/**
 * Get location permission settings
 */
export async function getLocationEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting location settings:', error);
    return false;
  }
}

/**
 * Request location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      // For iOS, we use Geolocation.requestAuthorization()
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
      });
      
      // Return a promise that resolves when the permission is granted
      return new Promise((resolve) => {
        Geolocation.requestAuthorization(
          () => {
            resolve(true);
          },
          (error) => {
            console.error('iOS location permission error:', error);
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error('Error requesting iOS location permission:', error);
      return false;
    }
  } else {
    // For Android, we use PermissionsAndroid
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'AgriMart needs access to your location to show nearby services and delivery options.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting Android location permission:', error);
      return false;
    }
  }
}

/**
 * Save location permission settings
 */
export async function saveLocationEnabled(enabled: boolean): Promise<boolean> {
  try {
    if (enabled) {
      // If enabling location, request permission first
      const permissionGranted = await requestLocationPermission();
      
      if (!permissionGranted) {
        // If permission was denied, inform the user and return false
        Alert.alert(
          'Location Permission Denied',
          'You need to grant location permission to use this feature. You can enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    
    // Save the setting
    await AsyncStorage.setItem(LOCATION_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log('Location settings saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving location settings:', error);
    return false;
  }
}

// Export as a named object
const settingsService = {
  getNotificationsEnabled,
  saveNotificationsEnabled,
  getLocationEnabled,
  saveLocationEnabled,
  requestLocationPermission,
};

export default settingsService;