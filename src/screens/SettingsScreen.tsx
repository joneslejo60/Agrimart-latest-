

import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import settingsService from '../services/settingsService';
import { useLanguage } from '../context/LanguageContext';


type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;


const SettingsScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Load saved settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Get notification settings
        const notificationSetting = await settingsService.getNotificationsEnabled();
        setNotificationsEnabled(notificationSetting);
        
        // Get location settings
        const locationSetting = await settingsService.getLocationEnabled();
        setLocationEnabled(locationSetting);
      } catch (error) {
        console.error('Error loading settings:', error);
        Alert.alert('Error', 'Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Handle notification toggle
  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotificationLoading(true);
      await settingsService.saveNotificationsEnabled(value);
      setNotificationsEnabled(value);
      
      // Show confirmation message
      if (value) {
        Alert.alert(
          'Notifications Enabled',
          'You will now receive notifications about orders, promotions, and updates.'
        );
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    } finally {
      setNotificationLoading(false);
    }
  };

  // Handle location toggle
  const handleLocationToggle = async (value: boolean) => {
    try {
      setLocationLoading(true);
      
      // This will handle permission requests and return true if successful
      const success = await settingsService.saveLocationEnabled(value);
      
      // Only update the state if the operation was successful
      if (success) {
        setLocationEnabled(value);
        
        // Show confirmation message
        if (value) {
          Alert.alert(
            'Location Access Enabled',
            'You can now use location-based features like nearby stores and delivery tracking.'
          );
        }
      } else {
        // If not successful, revert the switch to its previous state
        // This happens automatically since we don't update the state
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      Alert.alert('Error', 'Failed to update location settings. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Settings')}</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#09A84E" />
            <Text style={styles.loadingText}>{translate('Loading settings...')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.option}>
              <View style={styles.row}>
                <Ionicons name="notifications-outline" size={20} color="#000" />
                <Text style={styles.label}>{translate('Notifications')}</Text>
                {notificationLoading && (
                  <ActivityIndicator size="small" color="#09A84E" style={styles.smallLoader} />
                )}
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={notificationsEnabled ? '#81C784' : '#f4f3f4'}
                disabled={notificationLoading}
              />
            </View>

            <View style={styles.option}>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={20} color="#000" />
                <Text style={styles.label}>{translate('Location access')}</Text>
                {locationLoading && (
                  <ActivityIndicator size="small" color="#09A84E" style={styles.smallLoader} />
                )}
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={locationEnabled ? '#81C784' : '#f4f3f4'}
                disabled={locationLoading}
              />
            </View>
            
            {/* 
              Information paragraph was removed as requested.
              This section previously contained explanatory text about:
              1. What enabling notifications does (updates about orders, promotions, announcements)
              2. What location access provides (nearby stores, delivery estimates, recommendations)
            */}
          </>
        )}
      </View>

      <View style={styles.navBar}>
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ 
                name: 'HomeTabs', 
                params: { userName: '', userPhone: '' },
                state: {
                  routes: [{ name: 'Home', params: { userName: '', userPhone: '' } }],
                  index: 0,
                }
              }],
            });
          }}
        >
          <Ionicons name="home-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>{translate('Home')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ 
                name: 'HomeTabs', 
                params: { userName: '', userPhone: '' },
                state: {
                  routes: [{ name: 'Cart', params: { userName: '', userPhone: '' } }],
                  index: 0,
                }
              }],
            });
          }}
        >
          <Ionicons name="cart-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>{translate('Cart')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ 
                name: 'HomeTabs', 
                params: { userName: '', userPhone: '' },
                state: {
                  routes: [{ name: 'Profile', params: { userName: '', userPhone: '' } }],
                  index: 0,
                }
              }],
            });
          }}
        >
          <Ionicons name="person-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>{translate('Profile')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SettingsScreen;


const styles = StyleSheet.create({
  // 📱 Main container - Clean foundation for our content
  container: { 
    flex: 1, 
    backgroundColor: '#fff'  // Pure white for clarity and focus
  },

  // 🎯 Header section - Brand consistency and clear navigation
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', // Changed from center to flex-end to move content down
    backgroundColor: '#09A84E', 
    paddingHorizontal: 15,
    paddingTop: 45, // Increased top padding to move content down
    paddingBottom: 10,
    height: 88,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  backButton: { 
    marginRight: 10  // Breathing room between back button and title
  },
  headerText: { 
    color: '#fff',           // High contrast for readability
    fontSize: 20,            // Clear hierarchy - this is important
    fontWeight: 'bold'       // Emphasis for screen identification
  },

 
  content: {
    flex: 1,                 // Take up available space
    padding: 16,             // Consistent spacing from edges
    backgroundColor: '#ffffff', // Ensure clean background
    marginTop: 88,           // Added to account for absolute positioned header
  },

  option: {
    flexDirection: 'row',           // Icon + text on left, control on right
    justifyContent: 'space-between', // Push elements to opposite ends
    alignItems: 'center',           // Vertical alignment for visual harmony
    paddingVertical: 14,            // Generous touch targets for accessibility
    borderBottomWidth: 1,           // Subtle separation between options
    borderColor: '#eee',            // Light gray - visible but not distracting
  },
  
  row: {
    flexDirection: 'row',    // Icon beside text
    alignItems: 'center',    // Vertical alignment
  },

  label: {
    fontSize: 16,            // Comfortable reading size
    marginLeft: 10,          // Space between icon and text
    color: '#000',           // High contrast for accessibility
  },

  navBar: {
    flexDirection: 'row',           // Horizontal layout
    justifyContent: 'space-around', // Even distribution of icons
    paddingBottom: 5,               // Match original bottom tab padding
    paddingTop: 5,                  // Match original bottom tab padding
    height: 60,                     // Match original bottom tab height
    borderTopWidth: 1,              // Visual separation from content
    borderColor: '#ccc',            // Subtle border for definition
    backgroundColor: '#fff',        // Ensure clean background
    elevation: 8,                   // Android shadow
    shadowColor: '#000',            // iOS shadow
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },

  tabButton: {
    alignItems: 'center',           
    justifyContent: 'center',       
    flex: 1,                        
  },
  
  tabLabel: {
    fontSize: 12,                   
    color: 'gray',                  
    marginTop: 2,                   
  },
  
  // Loading indicators
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  smallLoader: {
    marginLeft: 10,
  }
  
  // Info text styles were removed as they're no longer needed
  /* 
  infoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  }
  */
});
