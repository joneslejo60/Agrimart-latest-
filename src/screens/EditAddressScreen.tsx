import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import apiService, { Address } from '../services/apiService';
import { getAddressFromCoordinates, AddressDetails } from '../services/geocodeService';
import { useLanguage } from '../context/LanguageContext';
import userService from '../services/userService';

const EditAddressScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'EditAddress'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditAddress'>>();

  const { userName, userPhone, addressData } = route.params || {};
  const isNewAddress = route.params?.isNewAddress || false;

  // For new addresses, use default values; for existing addresses, use the provided data or fallback to defaults
  const [addressType, setAddressType] = useState(isNewAddress ? 'Home' : (addressData?.type || addressData?.addressLine2 || 'Home'));
  const [address, setAddress] = useState(isNewAddress ? '' : (addressData?.address || addressData?.addressLine1 || ''));
  const [pincode, setPincode] = useState(isNewAddress ? '' : (addressData?.pincode || addressData?.zipCode || ''));
  // For phone number, use the provided userPhone for new addresses, or the address-specific phone for existing addresses
  const [phoneNumber, setPhoneNumber] = useState(isNewAddress ? userPhone : (addressData?.phone || addressData?.phoneNumber || userPhone || ''));

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Default to ITC Infotech Bangalore location if no coordinates are provided
  // This helps users by starting with a specific location in Bangalore
  const defaultCoordinates = {
    latitude: 12.971599,
    longitude: 77.594563, // ITC Infotech Bangalore coordinates
  };

  const [region, setRegion] = useState({
    latitude: addressData?.latitude || defaultCoordinates.latitude,
    longitude: addressData?.longitude || defaultCoordinates.longitude,
    latitudeDelta: 0.01, // Slightly zoomed out to show more of the surrounding area
    longitudeDelta: 0.01,
  });

  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: addressData?.latitude || defaultCoordinates.latitude,
    longitude: addressData?.longitude || defaultCoordinates.longitude,
  });

  const handleMapPress = (event: MapPressEvent) => {
    const { coordinate } = event.nativeEvent;
    setMarkerCoordinate(coordinate);
    setRegion({
      ...region,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
    setShowMap(true);
  };

  const handleConfirmLocation = async () => {
    setConfirming(true);
    
    // Check if user is using the default coordinates without selecting a location
    const isUsingDefaultCoordinates = 
      markerCoordinate.latitude === defaultCoordinates.latitude && 
      markerCoordinate.longitude === defaultCoordinates.longitude;
    
    if (isUsingDefaultCoordinates && isNewAddress) {
      Alert.alert(
        'Location Not Selected',
        'Please select your specific location on the map by tapping where you want to place the marker.',
        [{ text: 'OK' }]
      );
      setConfirming(false);
      return;
    }
    
    const addressDetails = await getAddressFromCoordinates(markerCoordinate.latitude, markerCoordinate.longitude);
    if (addressDetails) {
      setAddress(addressDetails.fullAddress);
      
      // Always set the pincode from the geocoding result
      // If it's empty, it will be displayed as empty and the user can fill it in
      setPincode(addressDetails.pincode);
      
      // Log the pincode for debugging
      console.log('Setting pincode from geocoding:', addressDetails.pincode);
      
      // If pincode is empty, inform the user they need to enter it manually
      if (!addressDetails.pincode) {
        setTimeout(() => {
          Alert.alert(
            'Postal Code Not Found',
            'Please enter the postal code (PIN code) manually.',
            [{ text: 'OK' }]
          );
        }, 500);
      }
      
      setShowMap(false);
    } else {
      Alert.alert('Error', 'Failed to fetch address from selected location.');
    }
    setConfirming(false);
  };

  // Track if the form has been submitted
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Add a unique ID for each instance of the component to track in logs
  const componentId = React.useRef(`edit-address-${Date.now()}`).current;
  
  const handleSave = async () => {
    const callTime = new Date().toISOString();
    console.log(`[${componentId}] handleSave called at ${callTime}`);
    
    // If we've already submitted or are loading, prevent duplicate submission
    if (hasSubmitted || loading) {
      console.log(`[${componentId}] Preventing duplicate submission - already submitted or loading`, { 
        hasSubmitted, 
        loading,
        callTime
      });
      return;
    }

    // Mark as submitted - this will permanently disable the button
    setHasSubmitted(true);

    // Validate required fields
    if (!addressType.trim() || !address.trim() || !pincode.trim() || !phoneNumber.trim()) {
      Alert.alert('Please fill all fields');
      setHasSubmitted(false); // Allow them to try again
      return;
    }
    // Validate Address Line 1
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Address Line 1 is required.');
      setHasSubmitted(false);
      setLoading(false);
      return;
    }
    
    // Ensure fullName meets the backend validation requirements (3-200 characters)
    const fullNameToUse = userName?.trim() || 'Customer';
    if (fullNameToUse.length < 3) {
      Alert.alert('Invalid Name', 'Name must be at least 3 characters long');
      setHasSubmitted(false); // Allow them to try again
      return;
    }
    
    // Check if user is using the default coordinates without selecting a location
    const isUsingDefaultCoordinates = 
      markerCoordinate.latitude === defaultCoordinates.latitude && 
      markerCoordinate.longitude === defaultCoordinates.longitude;
    
    if (isUsingDefaultCoordinates && isNewAddress) {
      Alert.alert(
        'Location Not Selected',
        'Please select your specific location on the map before saving the address.',
        [{ text: 'OK' }]
      );
      setHasSubmitted(false); // Allow them to try again
      setLoading(false);
      return;
    }

    console.log(`[${componentId}] Starting address submission at: ${callTime}`);
    setLoading(true);

    // Ensure we're using the same phone number that was used for logging in
    let userPhoneForAddress = userPhone || phoneNumber;
    
    // Check if the phone number is a UUID (which would be too long for the API's 20 char limit)
    const isUuid = userPhoneForAddress && userPhoneForAddress.includes('-');
    
    // If it's a UUID, use a shorter identifier or the last 10 digits of the phone number
    if (isUuid) {
      // For UUIDs, use just the first part (before the first dash) to stay under 20 chars
      userPhoneForAddress = userPhoneForAddress.split('-')[0] || userPhoneForAddress.substring(0, 20);
      console.log('Using shortened identifier for UUID:', userPhoneForAddress);
    } else if (userPhoneForAddress && userPhoneForAddress.length > 20) {
      // For other long identifiers, truncate to 20 chars
      userPhoneForAddress = userPhoneForAddress.substring(0, 20);
      console.log('Truncated phone number to 20 chars:', userPhoneForAddress);
    }
    
    // Get userId for backend association
    const user = await userService.getUser();
    const userId = user?.id;
    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      setHasSubmitted(false);
      setLoading(false);
      return;
    }

    // Map address string to street, city, state (best effort)
    const addressParts = address.split(',').map((part: string) => part.trim());
    const street = addressParts[0] || '';
    const city = addressParts[1] || 'Unknown';
    const state = addressParts[2] || 'Unknown';

    // Prepare payload for backend (only backend fields)
    const backendPayload: Address = {
      ...(addressData?.id ? { addressId: addressData.id } : {}),
      userId: userId,
      street,
      city,
      state,
      zipCode: pincode,
      latitude: markerCoordinate.latitude,
      longitude: markerCoordinate.longitude,
      addressLine1: address, // Ensure Address Line 1 is set
      country: 'India',
    };

    try {
      let response;
      console.log('Address data for edit/save:', {
        isNewAddress,
        addressId: addressData?.id,
        addressData
      });
      
      if (isNewAddress) {
        console.log(`[${componentId}] Adding new address at ${new Date().toISOString()}`);
        
        try {
          // Use a try-catch to ensure we can log any errors
          response = await apiService.address.addAddress(backendPayload);
          console.log(`[${componentId}] Address add API call completed at ${new Date().toISOString()}`);
        } catch (error) {
          console.error(`[${componentId}] Error in address add API call:`, error);
          throw error; // Re-throw to be caught by the outer catch block
        }
      } else if (addressData?.id) {
        const addressId = addressData.id;
        console.log(`[${componentId}] Updating existing address with ID: ${addressId} at ${new Date().toISOString()}`);
        
        // Make sure the ID is included in the payload
        const updatedPayload = {
          ...backendPayload,
          id: addressId // Ensure ID is explicitly set
        };
        
        // Preserve the original createdDate if it exists
        if (addressData.createdDate) {
          updatedPayload.createdDate = addressData.createdDate;
        }
        
        // Remove any properties that might be causing validation errors
        // These are typically computed properties or properties not expected by the API
        const cleanedPayload = { ...updatedPayload };
        
        // Ensure phoneNumber is valid (max 20 chars)
        if (cleanedPayload.phoneNumber && cleanedPayload.phoneNumber.length > 20) {
          cleanedPayload.phoneNumber = cleanedPayload.phoneNumber.substring(0, 20);
        }
        
        // Map UI-specific fields to their backend equivalents instead of removing them
        // Make sure addressLine1 is set from address if it's not already
        if (cleanedPayload.address && !cleanedPayload.addressLine1) {
          cleanedPayload.addressLine1 = cleanedPayload.address;
        }
        
        // Make sure zipCode is set from pincode if it's not already
        if (cleanedPayload.pincode && !cleanedPayload.zipCode) {
          cleanedPayload.zipCode = cleanedPayload.pincode;
        }
        
        // Now remove UI-specific fields
        delete cleanedPayload.address; // UI-specific field
        delete cleanedPayload.pincode; // UI-specific field
        delete cleanedPayload.phone;   // UI-specific field
        delete cleanedPayload.type;    // UI-specific field
        delete cleanedPayload.isDefault; // UI-specific field
        
        try {
          response = await apiService.address.updateAddress(addressId, cleanedPayload);
          console.log(`[${componentId}] Address update API call completed at ${new Date().toISOString()}`);
        } catch (error) {
          console.error(`[${componentId}] Error in address update API call:`, error);
          throw error; // Re-throw to be caught by the outer catch block
        }
      } else {
        console.log(`[${componentId}] No address ID found for update at ${new Date().toISOString()}`);
        Alert.alert('Invalid address data', 'Could not find address ID for update');
        setLoading(false);
        return;
      }

      if (response.success) {
        console.log(`[${componentId}] Address saved successfully at ${new Date().toISOString()}`);
        Alert.alert('Success', 'Address saved successfully', [
          {
            text: 'OK',
            onPress: () => {
              console.log(`[${componentId}] Navigating back after successful save at ${new Date().toISOString()}`);
              navigation.goBack();
            }
          }
        ]);
      } else {
        // Show a more detailed error message
        const errorMessage = response.error || 'Failed to save address';
        console.error(`[${componentId}] Error saving address at ${new Date().toISOString()}:`, errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      // Handle backend validation error gracefully
      if (error instanceof Error && error.message.includes('Address Line 1 is required')) {
        Alert.alert('Validation Error', 'Address Line 1 is required.');
      } else {
        Alert.alert('Error', 'Failed to save address. Please try again.');
      }
      setHasSubmitted(false);
      setLoading(false);
      return;
    } finally {
      setLoading(false);
      // Note: We don't reset lastSubmitTime here to maintain the debounce protection
      console.log(`[${componentId}] Completed address submission at: ${new Date().toISOString()}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{isNewAddress ? 'Add New Address' : 'Edit Address'}</Text>
      </View>

      {showMap ? (
        // Full screen map mode for selecting location
        <View style={styles.fullMapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
          >
            <Marker 
              coordinate={markerCoordinate} 
              title="ITC Infotech"
              description="Bangalore Office"
            />
          </MapView>
          <TouchableOpacity
            style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
            onPress={handleConfirmLocation}
            disabled={confirming}
          >
            <Text style={styles.confirmButtonText}>{confirming ? 'Confirming...' : 'Confirm Location'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Form mode with 25% map at the top
        <View style={styles.formContainer}>
          {/* Map taking 25% of the screen */}
          <View style={styles.smallMapContainer}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
              onPress={() => setShowMap(true)}
            >
              <Marker 
                coordinate={markerCoordinate} 
                title="ITC Infotech"
                description="Bangalore Office"
              />
            </MapView>
          </View>
          
          {/* Form fields in a scrollable area */}
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{translate('Address Type')}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={addressType}
                  onChangeText={setAddressType}
                  placeholder="Home / Work / Other"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{translate('Address')}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street address, area, city"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{translate('Pincode')}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="6-digit pincode"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{translate('Phone Number')}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Use a wrapper View to prevent any touch events during loading or after submission */}
            <View pointerEvents={(loading || hasSubmitted) ? 'none' : 'auto'}>
              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  (loading || hasSubmitted) && styles.disabledButton
                ]} 
                onPress={handleSave} 
                disabled={loading || hasSubmitted}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : hasSubmitted ? (
                  <Text style={styles.saveButtonText}>{translate('Processing...')}</Text>
                ) : (
                  <Text style={styles.saveButtonText}>{translate('Save Address')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#09A84E',
    paddingVertical: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    flex: 1,
  },
  // Full screen map container
  fullMapContainer: {
    flex: 1,
    position: 'relative',
  },
  // Container for form mode with map at top
  formContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  // Small map container (25% of screen)
  smallMapContainer: {
    height: '25%',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  // Form content
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 15,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  inputBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
  },
  textInput: {
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#09A84E',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#aaa', // Gray color to indicate disabled state
    opacity: 0.7,
  },
  // Legacy map container (kept for compatibility)
  mapContainer: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  confirmButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditAddressScreen;
