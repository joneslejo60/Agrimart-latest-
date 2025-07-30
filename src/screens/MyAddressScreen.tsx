import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import apiService, { Address } from '../services/apiService';
import { getUser, fetchCurrentUserFromApi } from '../services/userService';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MyAddressScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MyAddress'>;
type MyAddressScreenRouteProp = RouteProp<RootStackParamList, 'MyAddress'>;

const MyAddressScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<MyAddressScreenNavigationProp>(); 
  const route = useRoute<MyAddressScreenRouteProp>();

  const { userName, userPhone, source } = route.params || {};

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Format the user identifier at the component level so it's available throughout the component
  const [formattedUserPhone, setFormattedUserPhone] = useState<string>('');
  
  // Format the user phone number once when the component mounts or userPhone changes
  useEffect(() => {
    if (userPhone) {
      // Check if userPhone is actually a UUID (from user ID)
      const isUuid = userPhone.includes('-');
      
      let formatted = userPhone;
      if (isUuid) {
        // For UUIDs, we need to ensure it's not too long for the API (max 20 chars)
        // Use just the first part (before the first dash) to stay under 20 chars
        formatted = userPhone.split('-')[0] || userPhone.substring(0, 20);
        console.log('Using shortened identifier for UUID:', formatted);
      } else {
        // For regular phone numbers, format by removing spaces and country code
        formatted = userPhone.replace(/\s+/g, '');
        if (formatted.startsWith('+91')) {
          formatted = formatted.substring(3);
        }
      }
      
      // Ensure it's not longer than 20 characters (API limit)
      if (formatted.length > 20) {
        formatted = formatted.substring(0, 20);
      }
      
      setFormattedUserPhone(formatted);
    }
  }, [userPhone]);

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the user data to ensure we have the correct user ID
      let user = await getUser();
      if (!user || !user.id) {
        user = await fetchCurrentUserFromApi();
      }
      const currentUserId = user?.id;
      if (!currentUserId) {
        console.error('User ID not found');
        setError('User information not found. Please log in again.');
        setLoading(false);
        return;
      }
      let allAddresses: Address[] = [];
      let pageNumber = 1;
      let hasMore = true;
      const pageSize = 100; // Adjust as needed
      while (hasMore) {
        const response = await apiService.address.getAll(pageNumber, pageSize);
        if (response.success && response.data) {
          allAddresses = allAddresses.concat(response.data);
          if (response.data.length < pageSize) {
            hasMore = false;
          } else {
            pageNumber++;
          }
        } else {
          hasMore = false;
        }
      }
      // Filter addresses by userId
      const userAddresses = allAddresses.filter(addr => addr.userId === currentUserId);
      if (userAddresses.length === 0) {
        setAddresses([]);
        setLoading(false);
        return;
      }
      // Map the API response to the format expected by the UI
      const mappedAddresses = userAddresses
        .filter(addr => addr.statusId !== 0)
        .filter(addr => addr.fullName !== 'Deleted User' && addr.phoneNumber !== '0000000000')
        .map(addr => ({
          ...addr,
          id: typeof addr.id === 'string' ? addr.id : (addr.addressId ? String(addr.addressId) : undefined),
          type: addr.type || addr.addressLine2 || 'Home',
          address: addr.address || addr.addressLine1 || '',
          pincode: addr.pincode || addr.zipCode || '',
          phone: addr.phone || addr.phoneNumber || formattedUserPhone,
          isDefault: addr.isDefault || addr.isDefaultShipping || false
        }));
      setAddresses(mappedAddresses);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError('An unexpected error occurred while fetching addresses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAddress = (addressId: number | string) => {
    if (!addressId) {
      Alert.alert('Error', 'Invalid address ID');
      return;
    }

    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await apiService.address.deleteAddress(addressId);
              if (response.success) {
                setAddresses(prev => prev.filter(addr => (addr.addressId ?? addr.id) !== addressId));
                Alert.alert('Success', 'Address deleted successfully');
              } else {
                Alert.alert('Error', response.error || 'Failed to delete address');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting the address');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Load the default address ID from AsyncStorage
  const loadDefaultAddressId = async () => {
    try {
      const defaultId = await AsyncStorage.getItem('defaultAddressId');
      console.log('Loaded default address ID:', defaultId);
      return defaultId;
    } catch (error) {
      console.error('Error loading default address ID:', error);
      return null;
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const initializeScreen = async () => {
        // Load addresses directly - the fetchAddresses function will handle getting the user ID
        await fetchAddresses();
        
        // After fetching addresses, check if we have a saved default address ID
        const defaultId = await loadDefaultAddressId();
        
        if (defaultId) {
          console.log('Setting default address with ID:', defaultId);
          // Update the UI to reflect the default address
          setAddresses(prevAddresses => {
            return prevAddresses.map(addr => ({
              ...addr,
              isDefault: addr.id === defaultId
            }));
          });
        }
      };
      
      initializeScreen();
    }, []) // Remove dependency on formattedUserPhone since we're getting user ID from storage
  );

  // Function to save default address ID to AsyncStorage
  const saveDefaultAddressId = async (id: string) => {
    try {
      await AsyncStorage.setItem('defaultAddressId', id);
      console.log('Saved default address ID:', id);
    } catch (error) {
      console.error('Error saving default address ID:', error);
    }
  };

  const handleSelectAddress = async (address: Address, index: number) => {
    if (source === 'Cart') {
      navigation.navigate('HomeTabs', {
        userName: userName || '',
        userPhone: userPhone || '',
        screen: 'Cart',
        params: {
          userName: userName || '',
          userPhone: userPhone || '',
          selectedAddress: {
          ...address,
          // Ensure proper field mapping for CartScreen
          phone: address.phone || address.phoneNumber || userPhone || '',
          address: address.address || address.addressLine1 || '',
          pincode: address.pincode || address.zipCode || ''
        }
        }
      });
    } else {
      try {
        // Update the UI immediately
        setAddresses(prevAddresses => {
          return prevAddresses.map((addr, idx) => ({
            ...addr,
            isDefault: idx === index
          }));
        });
        
        // If the address has an ID, save it as the default
        if (address.id) {
          console.log('Setting default address with ID:', address.id);
          
          // Save the default address ID to AsyncStorage for persistence
          await saveDefaultAddressId(address.id);
          
          // Create a copy of the address with isDefault set to true
          const updatedAddress = {
            ...address,
            isDefault: true,
            isDefaultShipping: true,
            isDefaultBilling: true
          };
          
          // Update the address on the server
          const response = await apiService.address.updateAddress(address.id, updatedAddress);
          
          if (response.success) {
            console.log('Default address updated successfully');
            Alert.alert("Default Address", `${address.type} address set as default.`);
          } else {
            console.error('Failed to update default address:', response.error);
            // Still show success since we've updated locally
            Alert.alert("Default Address", `${address.type} address set as default.`);
          }
        } else {
          console.warn('Cannot set default address: No address ID');
          Alert.alert("Default Address", `${address.type} address set as default.`);
        }
      } catch (error) {
        console.error('Error setting default address:', error);
        // Still show success since we've updated locally
        Alert.alert("Default Address", `${address.type} address set as default.`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('My Address')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#09A84E" />
        </View>
      ) : addresses.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#888', textAlign: 'center', marginTop: 40 }}>
            No addresses saved yet.
          </Text>
          {/* Optionally, add a button to add a new address here */}
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {addresses.map((address, index) => {
            // Use a separate key for React, prefer addressId if present, else id, else index
            const uiKey = (address.addressId != null ? address.addressId : (address.id != null ? address.id : index));
            const deleteId = address.addressId != null ? address.addressId : address.id;
            return (
              <TouchableOpacity
                key={uiKey}
                onPress={() => handleSelectAddress(address, index)}
                onLongPress={() => deleteId != null && handleDeleteAddress(deleteId)}
                delayLongPress={500}
                style={{ width: '100%', marginBottom: 4 }}
              >
                <View style={styles.addressSection}>
                  <View style={styles.addressHeader}>
                    <View style={styles.titleContainer}>
                      <Text style={styles.sectionTitle}>{address.type}</Text>
                      {address.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>{translate('Default')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('EditAddress', {
                          userName: userName,
                          userPhone: formattedUserPhone, // Use the formatted phone number for consistency
                          addressData: {
                            ...address,
                            // Ensure all required fields are present
                            type: address.type || address.addressLine2 || 'Home',
                            address: address.address || address.addressLine1 || '',
                            pincode: address.pincode || address.zipCode || '',
                            phone: address.phone || address.phoneNumber || formattedUserPhone
                          },
                          addressIndex: undefined,
                          isNewAddress: false,
                          source: source
                        })}
                      >
                        <Text style={styles.editButtonText}>{translate('Edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteId != null && handleDeleteAddress(deleteId)}
                      >
                        <Text style={styles.deleteButtonText}>{translate('Delete')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.addressContentRow}>
                    <Icon name="location-pin" size={20} color="gray" style={styles.pinIcon} />
                    <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="tail">
                      {address.address}, {address.pincode}
                    </Text>
                  </View>
                  <View style={styles.addressContentRow}>
                    <Text style={styles.phoneText}>{address.phone}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.addAddressButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EditAddress', {
            userName: userName,
            userPhone: formattedUserPhone, // Use the formatted phone number for consistency
            addressData: {
              type: 'Home',
              address: '',
              pincode: '',
              phone: formattedUserPhone, // Use the formatted phone number for consistency
              addressLine1: '',
              addressLine2: 'Home',
              zipCode: '',
              phoneNumber: formattedUserPhone,
              isDefault: false,
              isDefaultShipping: false,
              isDefaultBilling: false
            },
            isNewAddress: true
          })}
        >
          <Icon name="add" size={24} color="white" style={styles.addIcon} />
          <Text style={styles.addAddressText}>{translate('Add New Address')}</Text>
        </TouchableOpacity>
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
                params: { userName: userName || '', userPhone: userPhone || '' },
                state: {
                  routes: [{ name: 'Home', params: { userName: userName || '', userPhone: userPhone || '' } }],
                  index: 0,
                }
              }],
            });
          }}
        >
          <Ionicons name="home-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{
                name: 'HomeTabs',
                params: { userName: userName || '', userPhone: userPhone || '' },
                state: {
                  routes: [{ name: 'Cart', params: { userName: userName || '', userPhone: userPhone || '' } }],
                  index: 0,
                }
              }],
            });
          }}
        >
          <Ionicons name="cart-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{
                name: 'HomeTabs',
                params: { userName: userName || '', userPhone: userPhone || '' },
                state: {
                  routes: [{ name: 'Profile', params: { userName: userName || '', userPhone: userPhone || '' } }],
                  index: 0,
                }
              }],
            });
          }}
        >
          <Ionicons name="person-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MyAddressScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

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
  backButton: { marginRight: 10 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  content: { 
    flex: 1,
    marginTop: 88, // Added to account for absolute positioned header
  },
  contentContainer: { 
    width: '100%',
    paddingTop: 2,
    paddingBottom: 2
  },

  addressSection: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    marginBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
    marginLeft: 28,
  },

  defaultBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
  },

  defaultBadgeText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '500',
  },

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  editButton: {
    borderWidth: 1,
    borderColor: '#09A84E',
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },

  editButtonText: {
    color: '#09A84E',
    fontSize: 12,
    fontWeight: '500',
  },
  
  deleteButton: {
    borderWidth: 1,
    borderColor: '#ff5252',
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },

  deleteButtonText: {
    color: '#ff5252',
    fontSize: 12,
    fontWeight: '500',
  },

  addressContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  pinIcon: {
    marginRight: 8,
  },

  addressText: {
    flex: 1,
    fontSize: 13,
    color: 'gray',
    marginBottom: 1,
  },

  phoneText: {
    flex: 1,
    fontSize: 13,
    color: 'gray',
    fontWeight: '500',
    marginLeft: 28,
  },

  bottomSection: {
    paddingVertical: 10,
  },

  addAddressButton: {
    backgroundColor: '#09A84E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },

  addIcon: {
    marginRight: 8,
  },

  addAddressText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
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
  }
});
