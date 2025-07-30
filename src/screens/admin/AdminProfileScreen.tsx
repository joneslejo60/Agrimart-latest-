import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  NativeStackNavigationProp
} from '@react-navigation/native-stack';
import {
  BottomTabNavigationProp
} from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp
} from '@react-navigation/native';
import { RootStackParamList, AdminTabsParamList } from '../../navigation/navigation.types';
import { useLanguage } from '../../context/LanguageContext';
import userService from '../../services/userService';
import AdminBottomTabNavigator from '../../navigation/AdminBottomTabNavigator';
import apiService from '../../services/apiService';
import { adminUserApi, AdminUserProfile } from '../../services/adminApiService';

type AdminProfileRouteProp = RouteProp<RootStackParamList, 'AdminProfile'>;
type AdminProfileNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabsParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const AdminProfileScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<AdminProfileNavigationProp>();
  const route = useRoute<AdminProfileRouteProp>();
  const { userName = '', userPhone = '', profileImage, designation = 'Manager' } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    userName: userName,
    userPhone: userPhone,
    profileImage: profileImage,
    designation: designation
  });

  // AsyncStorage functions
  const loadAdminProfile = async () => {
    try {
      const data = await AsyncStorage.getItem('adminProfile');
      if (data) {
        const savedProfile = JSON.parse(data);
        setProfileData(savedProfile);
        return savedProfile;
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
        // Get user from local storage (userService)
        const user = await userService.getUser();
        console.log('🔍 AdminProfile - Current user from storage:', user);
        if (user && user.id) {
          console.log('🔍 AdminProfile - Looking for userId:', user.id);
          const response = await adminUserApi.getUserById(user.id);
          console.log('🔍 AdminProfile - API response:', response);
          if (response && response.success && response.data) {
            const userData = response.data as AdminUserProfile;
            console.log('🔍 AdminProfile - Found user data:', userData);
            
            // Use local storage data as primary source (seems to be correct)
            // Only use API data for additional fields like profileImage
            const newProfileData = {
              userName: user.name || userData.name || '',
              userPhone: user.phoneNumber || userData.phoneNumber || '',
              profileImage: userData.profilePicture,
              designation: 'Manager',
            };
            console.log('🔍 AdminProfile - Setting profile data:', newProfileData);
            setProfileData(newProfileData);
            return;
          } else {
            console.log('🔍 AdminProfile - API call failed or no data');
          }
        }
        // fallback to AsyncStorage if backend fetch fails
        await loadAdminProfile();
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        await loadAdminProfile();
      }
    };
    fetchProfile();
  }, []);

  // Debug current profile data
  useEffect(() => {
    console.log('🔍 AdminProfile - Current profileData state:', profileData);
  }, [profileData]);

  StatusBar.setBarStyle('light-content');
  StatusBar.setBackgroundColor('#09A84E');
  if (Platform.OS === 'android') {
    StatusBar.setTranslucent(false);
  }

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleEditProfile = () => {
    navigation.navigate('EditAdminProfile', {
      userName: profileData.userName,
      userPhone: profileData.userPhone,
      profileImage: profileData.profileImage,
      designation: profileData.designation,
    });
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleLogout = async () => {
    Alert.alert(
      translate('Logout'),
      translate('Are you sure you want to logout?'),
      [
        {
          text: translate('Cancel'),
          style: 'cancel',
        },
        {
          text: translate('Logout'),
          onPress: async () => {
            setLoading(true);
            try {
              await userService.clearUserData();

              // Use the correct type for navigation.reset (RootStackParamList)
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'Splash' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Helper function to determine the image source
  const getImageSource = () => {
    if (profileData.profileImage) {
      return { uri: profileData.profileImage };
    }
    return require('../../assets/defaultuser.png');
  };

  const options: Array<{
    id: string;
    label: string;
    icon: string;
    color: string;
    action?: () => void;
  }> = [
    { 
      id: '1', 
      label: translate('Settings'), 
      icon: 'settings', 
      color: 'black',
      action: handleSettings,
    },
    {
      id: '2',
      label: translate('Privacy Policy'),
      icon: 'lock',
      color: 'black',
      action: handlePrivacyPolicy,
    },
    {
      id: '3',
      label: translate('Logout'),
      icon: 'exit-to-app',
      color: 'red',
      action: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Profile')}</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.profileContainer}>
          <View style={styles.profileImageContainer}>
            <Image source={getImageSource()} style={styles.profileImage} />
            <TouchableOpacity style={styles.imageEditButton}>
              <Icon name="camera-alt" size={20} color="black" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.name}>{profileData.userName}</Text>
            <Text style={styles.phone}>{profileData.userPhone}</Text>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={handleEditProfile}
            >
              <Text style={styles.editButtonText}>{translate('Edit Profile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((item) => (
            <TouchableOpacity key={item.id} style={styles.option} onPress={item.action}>
              <Icon name={item.icon} size={24} color={item.color} style={styles.optionIcon} />
              <Text style={[styles.optionText, { color: item.color }]}>{item.label}</Text>
              <Icon name="chevron-right" size={24} color="gray" style={styles.arrowIcon} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add custom bottom tab bar */}
      <View style={styles.customTabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigation.navigate('AdminTabs', {
            userName: profileData.userName,
            userPhone: profileData.userPhone,
            profileImage: profileData.profileImage,
            designation: profileData.designation,
            screen: 'AdminHome',
          })}
        >
          <Icon name="home" size={24} color="#666" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigation.navigate('AdminTabs', {
            userName: profileData.userName,
            userPhone: profileData.userPhone,
            profileImage: profileData.profileImage,
            designation: profileData.designation,
            screen: 'AdminOrders',
          })}
        >
          <Icon name="list" size={24} color="#666" />
          <Text style={styles.tabText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigation.navigate('AdminTabs', {
            userName: profileData.userName,
            userPhone: profileData.userPhone,
            profileImage: profileData.profileImage,
            designation: profileData.designation,
            screen: 'AdminInventory',
          })}
        >
          <Icon name="inventory" size={24} color="#666" />
          <Text style={styles.tabText}>Inventory</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
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
    fontFamily: 'Montserrat',
  },

  scrollContainer: {
    flex: 1,
    paddingTop: 88, // Account for the header height
    paddingBottom: 100, // Increased padding to give more space for bottom tabs
  },

  profileContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 22,
    marginTop: 27, // Reduced from 115 since we now have paddingTop on scrollContainer
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
    alignItems: 'flex-start',
  },
  name: { 
    fontSize: 15, 
    fontWeight: '600',
    fontFamily: 'Montserrat',
    width: 'auto',
    height: 18,
    lineHeight: 15,
    letterSpacing: 0,
    textAlign: 'left',
    color: '#000000',
  },
  phone: { 
    fontSize: 13, 
    color: '#000000',
    marginTop: 10,
    marginBottom: 5,
    fontFamily: 'Montserrat',
    fontWeight: '400',
    width: 'auto',
    height: 16,
    lineHeight: 13,
    letterSpacing: 0,
    textAlign: 'left',
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

  bottomTabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },

  customTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTabButton: {
    borderTopWidth: 2,
    borderTopColor: '#09A84E',
    backgroundColor: '#f6fff9',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  activeTabText: {
    color: '#09A84E',
    fontWeight: 'bold',
  },
});

export default AdminProfileScreen;
