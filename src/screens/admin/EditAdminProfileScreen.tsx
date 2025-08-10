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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/navigation.types';
import * as ImagePicker from 'react-native-image-picker';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/apiService';
import userService from '../../services/userService';
import { adminUserApi, AdminUserProfile } from '../../services/adminApiService';

type EditAdminProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditAdminProfile'>;
type EditAdminProfileScreenRouteProp = RouteProp<RootStackParamList, 'EditAdminProfile'>;


const EditAdminProfileScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<EditAdminProfileScreenNavigationProp>();
  const route = useRoute<EditAdminProfileScreenRouteProp>();
  
  // Get user data from route params
  const { userName = '', userPhone = '', profileImage: initialProfileImage, designation = 'Manager' } = route.params || {};
  
  // Default user image that's commonly used in apps
  const DEFAULT_USER_IMAGE = require('../../assets/defaultuser.png');
  
  // State management for form fields
  const [profileImage, setProfileImage] = useState<string | null>(initialProfileImage || null);
  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(userPhone || '');
  const [email, setEmail] = useState(''); // New field for email
  const [isSaving, setIsSaving] = useState(false);

  // AsyncStorage functions
  const saveAdminProfile = async (profileData: any) => {
    try {
      await AsyncStorage.setItem('adminProfile', JSON.stringify(profileData));
    } catch (error) {
      console.error('Error saving admin profile:', error);
    }
  };

  const loadAdminProfile = async () => {
    try {
      const data = await AsyncStorage.getItem('adminProfile');
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error loading admin profile:', error);
      return null;
    }
  };

  // Load profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await userService.getUser();
        if (user && user.id) {
          // Use local storage data as primary source (correct data)
          if (user.name) setName(user.name);
          if (user.phoneNumber) setPhone(user.phoneNumber);
          if (user.email) setEmail(user.email);
          
          // Only fetch from API for additional fields like profileImage
          const response = await adminUserApi.getUserById(user.id);
          if (response && response.success && response.data) {
            const userData = response.data as AdminUserProfile;
            if (userData.profilePicture) setProfileImage(userData.profilePicture);
          }
        }
        // fallback to AsyncStorage if backend fetch fails
        const savedProfile = await loadAdminProfile();
        if (savedProfile) {
          if (savedProfile.name) setName(savedProfile.name);
          if (savedProfile.phone) setPhone(savedProfile.phone);
          if (savedProfile.email) setEmail(savedProfile.email);
          if (savedProfile.profileImage) setProfileImage(savedProfile.profileImage);
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        const savedProfile = await loadAdminProfile();
        if (savedProfile) {
          if (savedProfile.name) setName(savedProfile.name);
          if (savedProfile.phone) setPhone(savedProfile.phone);
          if (savedProfile.email) setEmail(savedProfile.email);
          if (savedProfile.profileImage) setProfileImage(savedProfile.profileImage);
        }
      }
    };
    fetchProfile();
  }, []);

 
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

  /**
   Save Profile Changes Handler
   * 
   * Processes the updated profile information and navigates back
   * to the admin profile screen with the new data.
   */
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
      
      // Save to AsyncStorage
      const profileData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        profileImage: profileImage,
        designation: designation
      };
      
      await saveAdminProfile(profileData);
      
      // Update admin profile via manager API
      const user = await userService.getUser();
      if (user && user.id) {
        // First fetch the current user's profile to get passwordHash
        const currentProfileResponse = await adminUserApi.getUserById(user.id);
        let passwordHash = "";
        if (currentProfileResponse.success && currentProfileResponse.data) {
          const currentProfile = currentProfileResponse.data as AdminUserProfile;
          passwordHash = currentProfile.passwordHash || "";
        }
        
        const userProfilePayload = {
          userId: user.id, // Keep as string
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phone.trim(),
          profilePicture: profileImage || undefined,
          role: user.role || 'Manager', // Include role from current user
          passwordHash: passwordHash // Use fetched passwordHash
        };
        console.log('🔍 EditAdminProfile - State variables when saving:');
        console.log('🔍 EditAdminProfile - name state:', name);
        console.log('🔍 EditAdminProfile - email state:', email);
        console.log('🔍 EditAdminProfile - phone state:', phone);
        console.log('🔍 EditAdminProfile - userProfilePayload:', userProfilePayload);
        const response = await adminUserApi.updateManagerUser(user.id, userProfilePayload);
        if (!response.success) {
          Alert.alert('Error', response.error || 'Failed to update admin profile in backend');
        }
      }
      
      // Navigate back to admin profile with updated data
      navigation.navigate('AdminProfile', {
        userName: name.trim(),
        userPhone: phone.trim(),
        profileImage: profileImage || undefined,
        designation: designation
      });
      
      Alert.alert('Success', 'Profile updated successfully!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Email Validation Helper
   * 
   * Validates email format using a simple regex pattern.
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} />

      {/*  Header Section - Consistent with app design */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Edit Profile')}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}>
        <>
          {/*  Profile Image Section */}
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
          
          {/*  Form Fields Section */}
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
          <View style={{ height: 40 }} />
        </>

        {/*  Save Button */}
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

      {/*  Bottom Tab Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('AdminTabs', {
            userName,
            userPhone,
            profileImage: profileImage || undefined,
            designation,
            screen: 'AdminHome'
          })}
        >
          <Ionicons name="home-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('AdminTabs', {
            userName,
            userPhone,
            profileImage: profileImage || undefined,
            designation,
            screen: 'AdminOrders'
          })}
        >
          <Ionicons name="list-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('AdminTabs', {
            userName,
            userPhone,
            profileImage: profileImage || undefined,
            designation,
            screen: 'AdminInventory'
          })}
        >
          <Ionicons name="cube-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>Inventory</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EditAdminProfileScreen;


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },

  //  Header styling - matches ProfileScreen
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-end',
    backgroundColor: '#09A84E', 
    paddingHorizontal: 15,
    paddingTop: 45,
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

  // Content area
  content: { 
    flex: 1,
    paddingTop: 95,
    paddingHorizontal: 0,
    position: 'relative',
  },

  // Profile image section
  profileImageSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  profileImageContainer: { 
    alignSelf: 'center',
    position: 'relative',
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
    marginBottom: 20,
    width: 296,
    alignSelf: 'center',
    gap: 5,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'gray',
    marginBottom: 5,
    textAlign: 'left',
    paddingLeft: 15,
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
    paddingRight: 45,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000000',
    textAlign: 'left',
  },

  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  //  Save button
  saveButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 296,
    height: 48,
    alignSelf: 'center',
    marginTop: 20,
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
    backgroundColor: '#a5d6a7',
    opacity: 0.7,
    elevation: 0,
  },

  // Bottom navigation - matching admin design
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