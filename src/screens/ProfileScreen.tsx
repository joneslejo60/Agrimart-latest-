import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, HomeTabsParamList } from '../navigation/navigation.types';
import * as ImagePicker from 'react-native-image-picker';
import { useLanguage } from '../context/LanguageContext';
import userService from '../services/userService';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HomeTabs'>;
type ProfileScreenRouteProp = RouteProp<HomeTabsParamList, 'Profile'>;


const ProfileScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute<ProfileScreenRouteProp>();
  
  const { userName, userPhone, profileImage: initialProfileImage } = route.params || {};
  
  // Default user image that's commonly used in apps
  const DEFAULT_USER_IMAGE = require('../assets/defaultuser.png');
  
  // Use the profile image passed from EditProfileScreen or null
  const [profileImage, setProfileImage] = useState(initialProfileImage || null);
  
  // State for user data
  const [currentUserName, setCurrentUserName] = useState(userName || '');
  const [currentUserPhone, setCurrentUserPhone] = useState(userPhone || '');
  
  // Log the profile image received from navigation params
  console.log('ProfileScreen received profile image:', initialProfileImage);
  
  // Update profile image when route params change
  useEffect(() => {
    if (initialProfileImage) {
      console.log('Updating profile image from route params:', initialProfileImage);
      setProfileImage(initialProfileImage);
    }
  }, [initialProfileImage]);
  
  // Refresh user data when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserData = async () => {
        try {
          console.log('🔄 ProfileScreen gained focus - refreshing user data');
          const userData = await userService.getUser();
          if (userData) {
            console.log('✅ Refreshed user data:', userData);
            setCurrentUserName(userData.name || userName || '');
            setCurrentUserPhone(userData.phoneNumber || userPhone || '');
            // Update the display variables as well
            setName(userData.name || userName || 'User Name');
            setPhone(formatPhoneNumber(userData.phoneNumber || userPhone));
            if (userData.profilePicture) {
              setProfileImage(userData.profilePicture);
            }
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      };
      
      refreshUserData();
    }, [userName, userPhone])
  );
  
  // Load user data from storage when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await userService.getUser();
        if (userData) {
          // Update name if available
          if (userData.name) {
            setName(userData.name);
          }
          
          // Update phone number if available
          if (userData.phoneNumber) {
            const formattedNumber = userData.phoneNumber.startsWith('+91') 
              ? userData.phoneNumber 
              : `+91 ${userData.phoneNumber}`;
            setPhone(formattedNumber);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);
  
  // Helper function to determine the image source
  const getImageSource = () => {
    if (profileImage) {
      return { uri: profileImage };
    }
    return DEFAULT_USER_IMAGE;
  };
  const [name, setName] = useState(currentUserName || 'User Name');
  // Ensure phone number is properly formatted
  const formatPhoneNumber = (phoneStr: string | undefined): string => {
    if (!phoneStr) return '+91 9123456789'; // Default phone
    
    // If it's a token (usually longer than a phone number and doesn't start with +91)
    if (phoneStr.length > 15 && !phoneStr.startsWith('+91')) {
      // Try to get the phone number from AsyncStorage
      userService.getUser().then(userData => {
        if (userData?.phoneNumber) {
          const formattedNumber = userData.phoneNumber.startsWith('+91') 
            ? userData.phoneNumber 
            : `+91 ${userData.phoneNumber}`;
          setPhone(formattedNumber);
        }
      }).catch(err => {
        console.error('Error getting user data:', err);
      });
      
      return '+91 9123456789'; // Return default instead of showing token
    }
    
    // If it's just the number without country code
    if (!phoneStr.startsWith('+91') && phoneStr.length <= 10) {
      return `+91 ${phoneStr}`;
    }
    
    return phoneStr;
  };
  
  const [phone, setPhone] = useState(formatPhoneNumber(currentUserPhone));

  const options: Array<{
    id: string;
    label: string;
    icon: string;
    color: string;
    action?: () => void;
  }> = [
    // { 
    //   id: '1', 
    //   label: translate('My Orders'), 
    //   icon: 'shopping-cart', 
    //   color: 'black',
    //   action: () => navigation.navigate('MyOrders', {
    //     userName: name,
    //     userPhone: phone,
    //   }),
    // },
    { 
      id: '2', 
      label: translate('My Address'), 
      icon: 'location-on', 
      color: 'black',
      action: () => navigation.navigate('MyAddress', {
        userName: name,
        userPhone: phone,
        addressData: undefined, // Will use default address data
      }),
    },
    { 
      id: '3', 
      label: translate('Settings'), 
      icon: 'settings', 
      color: 'black',
      action: () => navigation.navigate('Settings'),
    },
    {
      id: '4',
      label: translate('Privacy Policy'),
      icon: 'lock',
      color: 'black',
      action: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      id: '5',
      label: translate('Logout'),
      icon: 'exit-to-app',
      color: 'red',
      action: () => {
        Alert.alert(
          translate('Logout'),
          'Are you sure you want to logout?',
          [
            {
              text: translate('Cancel'),
              style: 'cancel',
            },
            {
              text: translate('Logout'),
              onPress: async () => {
                try {
                  // Clear authentication data
                  await userService.clearUserData();
                  
                  // Navigate back to splash/onboarding
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Splash' }],
                  });
                } catch (error) {
                  console.error('Error during logout:', error);
                  Alert.alert('Error', 'Failed to logout. Please try again.');
                }
              },
            },
          ]
        );
      },
    },
  ];

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Profile')}</Text>
      </View>

      <View style={styles.profileContainer}>
        <View style={styles.profileImageContainer}>
          <Image source={getImageSource()} style={styles.profileImage} />
          <TouchableOpacity style={styles.imageEditButton} onPress={changeProfilePhoto}>
            <Icon name="camera-alt" size={20} color="black" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.phone}>{phone}</Text>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => {
              console.log('Navigating to EditProfile with image:', profileImage);
              navigation.navigate('EditProfile', {
                userName: name,
                userPhone: phone,
                profileImage: profileImage || undefined
              });
            }}
          >
            <Text style={styles.editButtonText}>{translate('Edit Profile')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.optionsContainer}>
        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.option} onPress={item.action}>
              <Icon name={item.icon} size={24} color={item.color} style={styles.optionIcon} />
              <Text style={[styles.optionText, { color: item.color }]}>{item.label}</Text>
              <Icon name="chevron-right" size={24} color="gray" style={styles.arrowIcon} />
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
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
    fontFamily: 'Montserrat',
  },

  profileContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 22,
    marginTop: 115, // Positioning based on design spec
  },
  profileImageContainer: { 
    position: 'relative',
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60 
  },
  imageEditButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },

  profileDetails: { 
    marginLeft: 31, 
    flex: 1,
    alignItems: 'flex-start', // Align children to the left
  },
  name: { 
    fontSize: 15, 
    fontWeight: '600',
    fontFamily: 'Montserrat',
    width: 'auto', // Allow width to adjust to content
    height: 18,
    lineHeight: 15,
    letterSpacing: 0,
    textAlign: 'left', // Align text to the left
    color: '#000000', // Set text color to black
  },
  phone: { 
    fontSize: 13, 
    color: '#000000', // Changed from gray to black
    marginTop: 10,
    marginBottom: 22,
    fontFamily: 'Montserrat',
    fontWeight: '400',
    width: 'auto', // Allow width to adjust to content
    height: 16,
    lineHeight: 13,
    letterSpacing: 0,
    textAlign: 'left', // Align text to the left
  },

  editButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 4,
    width: 128,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  editButtonText: { 
    color: '#fff', 
    fontSize: 14,
    fontFamily: 'Montserrat',
  },

  optionsContainer: {
    width: 331,
    marginTop: 30,
    alignSelf: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    justifyContent: 'space-between',
  },
  optionIcon: { 
    marginRight: 10 
  },
  optionText: { 
    fontSize: 16, 
    flex: 1,
    fontFamily: 'Montserrat',
  },
  arrowIcon: { 
    marginLeft: 'auto' 
  },
});
