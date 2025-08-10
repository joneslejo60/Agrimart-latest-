

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar, 
  Image,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import * as ImagePicker from 'react-native-image-picker';
import apiService from '../services/apiService';
import { getUser, fetchCurrentUserFromApi, getAuthToken, saveUser } from '../services/userService';
import { useLanguage } from '../context/LanguageContext';


type EditProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
type EditProfileScreenRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;


const EditProfileScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const route = useRoute<EditProfileScreenRouteProp>();
  
  // Get user data from route params
  const { userName, userPhone, profileImage: initialProfileImage } = route.params || {};
  
  // Default user image that's commonly used in apps
  const DEFAULT_USER_IMAGE = require('../assets/defaultuser.png');
  // Ensure the default image is loaded
  console.log('Loading default user image from:', '../assets/defaultuser.png');
  
  // State management for form fields
  // Initialize profileImage as null so the DEFAULT_USER_IMAGE will be shown if no image is provided
  const [profileImage, setProfileImage] = useState<string | null>(initialProfileImage || null);
  
  // Log initial profile image for debugging
  console.log('Initial profile image:', initialProfileImage);
  console.log('Default user image path:', DEFAULT_USER_IMAGE);
  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(userPhone || '');
  const [email, setEmail] = useState(''); // New field for email - starts empty for first-time login
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch current user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        console.log('EditProfileScreen - Route params:', { userName, userPhone, initialProfileImage });
        
        // First prioritize route params if they exist
        if (userName) {
          console.log('Using name from route params:', userName);
          setName(userName);
        }
        
        if (userPhone) {
          console.log('Using phone from route params:', userPhone);
          setPhone(userPhone);
        }
        
        if (initialProfileImage) {
          console.log('Using profile image from route params:', initialProfileImage);
          setProfileImage(initialProfileImage);
        }
        
        // Then get data from local storage or API
        let currentUser = await getUser();
        if (!currentUser || !currentUser.id) {
          currentUser = await fetchCurrentUserFromApi();
        }
        if (currentUser) {
          setUserId(currentUser.id);
          
          // Only set these values if they weren't already set from route params
          if (!userName && currentUser.name) {
            console.log('Using name from storage:', currentUser.name);
            setName(currentUser.name);
          }
          
          if (!userPhone && currentUser.phoneNumber) {
            console.log('Using phone from storage:', currentUser.phoneNumber);
            setPhone(currentUser.phoneNumber);
          }
          
          if (currentUser.email) {
            console.log('Using email from storage:', currentUser.email);
            setEmail(currentUser.email);
          }
          
          if (currentUser.profilePicture && !initialProfileImage) {
            console.log('Using profile image from storage:', currentUser.profilePicture);
            setProfileImage(currentUser.profilePicture);
          }
          
          // If we have a user ID, try to get more details from the API
          if (currentUser.id) {
            try {
              console.log('Fetching user profile from API with current user endpoint');
              const token = await getAuthToken();
              const response = await apiService.userProfile.getCurrent(token || '');
              if (response.success && response.data) {
                console.log('API profile data:', response.data);
                
                // Only update if we don't already have values from route params or storage
                if (!userName && !currentUser.name && response.data.name) {
                  console.log('Using name from API:', response.data.name);
                  setName(response.data.name);
                }
                
                if (!currentUser.email && response.data.email) {
                  console.log('Using email from API:', response.data.email);
                  setEmail(response.data.email);
                }
                
                if (!userPhone && !currentUser.phoneNumber && response.data.phoneNumber) {
                  console.log('Using phone from API:', response.data.phoneNumber);
                  setPhone(response.data.phoneNumber);
                }
                
                // If there's a profile picture URL in the response and we don't have one from route params or storage
                if (!initialProfileImage && !currentUser.profilePicture && response.data.profilePicture) {
                  console.log('Setting profile image from API response:', response.data.profilePicture);
                  setProfileImage(response.data.profilePicture);
                }
              } else {
                console.log('No user profile found in API or request failed');
              }
            } catch (apiError) {
              console.error('Error fetching user profile from API:', apiError);
              // Continue with local data if API fails
            }
          }
        } else {
          console.log('No user data found in storage');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userName, userPhone, initialProfileImage]);


  const changeProfilePhoto = () => {
    Alert.alert('Change Profile Picture', 'Select an option', [
      {
        text: 'Camera',
        onPress: () => {
          ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 }, (response) => {
            if (!response.didCancel && response.assets?.length && response.assets[0].uri) {
              setProfileImage(response.assets[0].uri);
            }
          });
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
            if (!response.didCancel && response.assets?.length && response.assets[0].uri) {
              setProfileImage(response.assets[0].uri);
            }
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSaveDetails = async () => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    
    if (email && !validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Get current user
      const currentUser = await getUser();
      
      // If no current user, create a new one with the entered data
      const userId = currentUser?.id || `user_${Date.now()}`;
      
      // Update local user data first
      const updatedUserData = {
        id: userId,
        name: name.trim(),
        phoneNumber: phone.trim(),
        email: email.trim(),
        // Convert null to undefined to match User interface
        profilePicture: profileImage || undefined
      };
      
      console.log('Saving user data with profile picture:', profileImage);
      console.log('Updated user data:', updatedUserData);
      
      // Save to local storage FIRST - this ensures immediate UI updates
      await saveUser(updatedUserData);
      console.log('✅ User data saved to local storage');
      
      // Try to update via API
      try {
        // Create request payload
        const userProfileData = {
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phone.trim(),
          
          ...(profileImage !== null ? { profilePicture: profileImage } : {}),
   
          password: 'UNCHANGED_PASSWORD'
        };
        
        console.log('Sending profile data to API:', userProfileData);
        
        
        let apiResponse;
        
        if (userId) {
          // Check if the user profile exists by trying to get it
          console.log('Checking if user profile exists in API with ID:', userId);
          const checkResponse = await apiService.userProfile.getById(userId);
          console.log('API check response:', checkResponse);
          
          if (!checkResponse.success || !checkResponse.data) {
            console.log('User profile does not exist in API, creating new profile');
            try {
              // Only attempt to create a new profile if one doesn't exist
              apiResponse = await apiService.userProfile.create(userProfileData);
              console.log('Created new user profile in API, response:', apiResponse);
              
              if (apiResponse.success && apiResponse.data?.profilePicture) {
                // Update the profile image with the one from the API if available
                console.log('Updating profile image from API response:', apiResponse.data.profilePicture);
                setProfileImage(apiResponse.data.profilePicture);
                updatedUserData.profilePicture = apiResponse.data.profilePicture;
                await saveUser(updatedUserData);
                console.log('✅ User data updated with API profile picture');
              }
            } catch (createError) {
              console.error('Failed to create user profile in API:', createError);
              // Continue with local update even if API fails
            }
          } else {
            console.log('User profile exists in API, attempting to update');
            try {
              // Try to update the existing profile
              apiResponse = await apiService.userProfile.update(userId, userProfileData);
              console.log('Updated user profile in API, response:', apiResponse);
              
              if (apiResponse.success && apiResponse.data?.profilePicture) {
                // Update the profile image with the one from the API if available
                console.log('Updating profile image from API update response:', apiResponse.data.profilePicture);
                setProfileImage(apiResponse.data.profilePicture);
                updatedUserData.profilePicture = apiResponse.data.profilePicture;
                await saveUser(updatedUserData);
                console.log('✅ User data updated with API update response');
              }
            } catch (updateError) {
              console.error('Failed to update user profile in API:', updateError);
              // Continue with local update even if API fails
            }
          }
        } else {
          console.log('No user ID available, creating new profile in API');
          // No user ID, create a new profile
          apiResponse = await apiService.userProfile.create(userProfileData);
          console.log('Created new user profile in API, response:', apiResponse);
          
          if (apiResponse.success && apiResponse.data?.profilePicture) {
            // Update the profile image with the one from the API if available
            console.log('Updating profile image from API create response:', apiResponse.data.profilePicture);
            setProfileImage(apiResponse.data.profilePicture);
            updatedUserData.profilePicture = apiResponse.data.profilePicture;
            await saveUser(updatedUserData);
            console.log('✅ User data updated with API create response');
          }
        }
        
        if (apiResponse && !apiResponse.success) {
          console.warn('API update failed:', apiResponse.error);
          // Continue with local update even if API fails
        }
      } catch (apiError) {
        console.error('Error updating profile via API:', apiError);
        // Continue with local update even if API fails
      }
      
      // Format phone number for display
      const formattedPhone = phone.startsWith('+91') ? phone : `+91 ${phone}`;
      
  
      const finalProfileImage = updatedUserData.profilePicture || profileImage;
      console.log('Final profile image to use for navigation:', finalProfileImage);
      
      // Show success message
      Alert.alert(
        'Profile Updated',
        'Your profile has been successfully updated!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Log the profile image before navigation to verify it's being passed
              console.log('Navigating with profile image:', finalProfileImage);
              console.log('Navigating with name:', name);
              console.log('Navigating with phone:', formattedPhone);
              
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'HomeTabs', 
                  params: { 
                    userName: name.trim(), 
                    userPhone: formattedPhone, 
                    profileImage: finalProfileImage // Pass profile image in params
                  },
                  state: {
                    routes: [{ 
                      name: 'Profile', 
                      params: { 
                        userName: name.trim(), 
                        userPhone: formattedPhone, 
                        profileImage: finalProfileImage // Pass profile image to Profile screen
                      } 
                    }],
                    index: 0,
                  }
                }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper function to validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      {/* 🎯 Header Section - Consistent with app design */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Profile')}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#09A84E" />
            <Text style={styles.loadingText}>{translate('Loading profile data...')}</Text>
          </View>
        ) : (
          <>
            {/* 📸 Profile Image Section */}
            <View style={styles.profileImageSection}>
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.profileImage}
                    onError={() => {
                      console.log('Error loading profile image, falling back to default');
                      setProfileImage(null);
                    }}
                  />
                ) : (
                  <Image 
                    source={DEFAULT_USER_IMAGE} 
                    style={styles.profileImage}
                  />
                )}
                <TouchableOpacity style={styles.imageEditButton} onPress={changeProfilePhoto}>
                  <Icon name="camera-alt" size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* 📝 Form Fields Section */}
            <View style={styles.formSection}>
              {/* Username Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{translate('Username')}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                  />
                  {name.length > 0 && (
                    <TouchableOpacity 
                      style={styles.clearButton} 
                      onPress={() => setName('')}
                    >
                      <Icon name="close" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Phone Number Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{translate('Phone Number')}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                  {phone.length > 0 && (
                    <TouchableOpacity 
                      style={styles.clearButton} 
                      onPress={() => setPhone('')}
                    >
                      <Icon name="close" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{translate('Email')}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email address"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {email.length > 0 && (
                    <TouchableOpacity 
                      style={styles.clearButton} 
                      onPress={() => setEmail('')}
                    >
                      <Icon name="close" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
            
            {/* Spacer to push the save button down */}
            <View style={{ height: 80 }} />
          </>
        )}

        {/* 💾 Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSaveDetails}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>{translate('Save Details')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 🧭 Bottom Navigation Bar - Matching Original Design */}
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
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },

  // 🎯 Header styling - matches ProfileScreen
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
    marginRight: 10 
  },
  headerText: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold',
    textAlign: 'left'
  },

  // 📄 Content area
  content: { 
    flex: 1,
    paddingTop: 95, // Increased top padding to account for absolute header
    paddingHorizontal: 0,
    position: 'relative',
  },

  // 📸 Profile image section
  profileImageSection: {
    alignItems: 'center',
    marginTop: 20, // Adjusted margin to match ProfileScreen
    marginBottom: 20, // Adjusted margin to match ProfileScreen
  },
  profileImageContainer: { 
    alignSelf: 'center',
    position: 'relative', // Added to match ProfileScreen
    marginBottom: 15,
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#e0e0e0',
  },
  imageEditButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  // 📝 Form section
  formSection: {
    marginBottom: 20, // Reduced bottom margin
    width: 296,
    alignSelf: 'center',
    gap: 5, // Further reduced gap
  },
  inputContainer: {
    marginBottom: 8, // Even further reduced spacing between form fields
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'gray', // Gray color for labels
    marginBottom: 5, // Reduced bottom margin to decrease spacing
    textAlign: 'left', // Left align the label as usual
    paddingLeft: 15, // Add padding to align with input text
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    paddingRight: 45, // Make space for the X button
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000000', // Black color for input text
    textAlign: 'left', // Left align the input text as usual
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 💾 Save button
  saveButton: {
    backgroundColor: '#09A84E', // PRIMARY #09A84E
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 296,
    height: 48,
    alignSelf: 'center',
    marginTop: 20, // Reduced since we're using a spacer view
    marginBottom: 20,
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  saveButtonDisabled: {
    backgroundColor: '#a5d6a7', // Lighter #09A84E
    opacity: 0.7,
    elevation: 0,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },

  // 🧭 Bottom navigation - matching original design
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