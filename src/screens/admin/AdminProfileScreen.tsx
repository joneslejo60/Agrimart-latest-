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
  // Static admin data - no API calls
  const [profileData] = useState({
    userName: 'ADMIN',
    userPhone: '',
    profileImage: undefined as string | undefined,
    designation: 'Manager'
  });

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
          </View>
          <Text style={styles.adminLabel}>Admin</Text>
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
    alignItems: 'center', 
    paddingHorizontal: 22,
    marginTop: 27,
  },
  profileImageContainer: { 
    position: 'relative',
    marginBottom: 8,
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
  adminLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#09A84E',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
});

export default AdminProfileScreen;
