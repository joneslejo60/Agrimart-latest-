import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Platform,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, AdminTabsParamList } from '../../navigation/navigation.types';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/apiService';
import { OrderStatusStorage } from '../../utils/orderStatusStorage';

type AdminOrderHandleNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminOrderHandle'>;
type AdminOrderHandleRouteProp = RouteProp<RootStackParamList, 'AdminOrderHandle'>;

// Add types for fetched data
interface Product {
  productId: number;
  name?: string;
  price?: number;
  imageUrl?: string;
}
interface Address {
  addressId: number;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}
interface UserProfile {
  userId: number;
  name?: string;
  phoneNumber?: string;
}

const AdminOrderHandle = () => {
  const { language, translate } = useLanguage();
  const navigation = useNavigation<AdminOrderHandleNavigationProp>();
  const route = useRoute<AdminOrderHandleRouteProp>();
  const { 
    userName = '', 
    userPhone = '', 
    designation = 'Manager', 
    profileImage,
    orderId = '',
    orderData = null
  } = route.params || {};
  
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Shipped');
  const [currentStatus, setCurrentStatus] = useState('Shipped');
  const [address, setAddress] = useState<Address | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Show status bar when AdminOrderHandle mounts
  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#09A84E');
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);

  // Load saved status on component mount
  useEffect(() => {
    async function loadSavedStatus() {
      if (orderData?.id) {
        const savedStatus = await OrderStatusStorage.getOrderStatus(orderData.id);
        const effectiveStatus = savedStatus || orderData.status || 'Shipped';
        setCurrentStatus(effectiveStatus);
        setSelectedStatus(effectiveStatus);
        console.log(`📦 Loaded status for order ${orderData.id}: ${effectiveStatus}`);
      }
    }
    loadSavedStatus();
  }, [orderData?.id]);

  useEffect(() => {
    async function fetchDetails() {
      if (orderData && orderData.shippingAddressId) {
        try {
          // Convert to string as the API expects string ID
          const addressResp = await apiService.address.getById(String(orderData.shippingAddressId));
          if (addressResp.success && addressResp.data) {
            const addr = {
              addressId: addressResp.data.addressId ?? orderData.shippingAddressId,
              street: addressResp.data.street ?? addressResp.data.addressLine1 ?? '',
              city: addressResp.data.city ?? '',
              state: addressResp.data.state ?? '',
              zipCode: addressResp.data.zipCode ?? ''
            };
            setAddress(addr);
          } else {
            // Fallback: try fetching from all addresses and find the matching one
            const allAddressesResp = await apiService.address.getAll(1, 100);
            if (allAddressesResp.success && allAddressesResp.data) {
              const matchingAddress = allAddressesResp.data.find(addr => 
                addr.addressId === orderData.shippingAddressId || 
                String(addr.addressId) === String(orderData.shippingAddressId)
              );
              if (matchingAddress) {
                const addr = {
                  addressId: matchingAddress.addressId ?? orderData.shippingAddressId,
                  street: matchingAddress.street ?? matchingAddress.addressLine1 ?? '',
                  city: matchingAddress.city ?? '',
                  state: matchingAddress.state ?? '',
                  zipCode: matchingAddress.zipCode ?? ''
                };
                setAddress(addr);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching address:', error);
        }
      }
      if (orderData && orderData.userId) {
        const userResp = await apiService.userProfile.getById(orderData.userId);
        setUserProfile(userResp.data);
      }
    }
    fetchDetails();
  }, [orderData]);

  const handleGoToAdminOrders = () => {
    navigation.navigate('AdminTabs', {
      userName,
      userPhone,
      profileImage,
      designation,
      screen: 'AdminOrders'
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setSelectedStatus(newStatus);
    setShowStatusOptions(false);
    setIsUpdating(true);
    
    // Simulate processing time for better UX
    setTimeout(async () => {
      setCurrentStatus(newStatus);
      
      // Save status to storage
      if (orderData?.id) {
        await OrderStatusStorage.saveOrderStatus(orderData.id, newStatus);
      }
      
      setIsUpdating(false);
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoToAdminOrders} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Orders')}</Text>
        <View style={styles.headerSpacer} />
      </View>



      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Order List Heading */}
          <Text style={styles.orderListHeading}>{translate('Order List')}</Text>
          
          {/* Products List */}
          <View style={styles.productList}>
          {orderData?.orderItems?.map((item: any, index: number) => {
            return (
              <View key={`product-${item.orderItemId || index}`} style={styles.productItem}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Icon name="image" size={24} color="#ccc" />
                  </View>
                )}
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{item.productName || 'Product'}</Text>
                  <Text style={styles.productQuantity}>Qty-{item.quantity}</Text>
                </View>
                <Text style={styles.productPrice}>₹{item.price}</Text>
              </View>
            );
          })}

          </View>

          {/* Total Cost Box */}
          <View style={styles.totalCostBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>₹{orderData?.totalAmount || 0}</Text>
          </View>

          {/* Order ID */}
          <View style={styles.orderIdBox}>
            <Text style={styles.orderIdText}>Order ID: {orderData?.id || orderId || 'ORD001'}</Text>
          </View>

          {/* User Details & Address */}
          <View style={styles.userDetailsBox}>
            <Text style={styles.userDetailsHeading}>User Details & Address</Text>
            
            <View style={styles.userInfoRow}>
              <Icon name="user" size={16} color="#333" style={styles.userIcon} />
              <Text style={styles.userInfoText}>{userProfile?.name || 'N/A'}</Text>
            </View>
            
            <View style={styles.userInfoRow}>
              <Icon name="phone" size={16} color="#333" style={styles.userIcon} />
              <Text style={styles.userInfoText}>{userProfile?.phoneNumber || 'N/A'}</Text>
            </View>
            
            <View style={styles.userInfoRow}>
              <Icon name="map-marker" size={16} color="#333" style={styles.userIcon} />
              <Text style={styles.userInfoText}>
                {address ? `${address.street}, ${address.city}, ${address.state}, ${address.zipCode}` : 'Loading address...'}
              </Text>
            </View>
          </View>

          {/* Delivery Status */}
          <View style={styles.deliveryStatusBox}>
            <View style={styles.deliveryStatusRow}>
              <Text style={styles.deliveryStatusLabel}>Delivery Status</Text>
              <TouchableOpacity 
                style={[
                  styles.deliveryStatusButton,
                  isUpdating && styles.updatingButton
                ]} 
                onPress={() => !isUpdating && setShowStatusOptions(!showStatusOptions)}
                disabled={isUpdating}
              >
                <Text style={[
                  styles.deliveryStatusButtonText,
                  isUpdating && styles.updatingText
                ]}>
                  {isUpdating ? 'Updating...' : currentStatus}
                </Text>
                {!isUpdating && (
                  <Icon name={showStatusOptions ? "chevron-up" : "chevron-down"} size={12} color="#09A84E" />
                )}
                {isUpdating && (
                  <Icon name="spinner" size={12} color="#666" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.deliveryDateRow}>
              <Text style={styles.deliveryDateLabel}>
                {currentStatus === 'Confirmed' ? 'Confirmed on' : 
                  currentStatus === 'Processing' ? 'Processing since' : 
                  currentStatus === 'Shipped' ? 'Shipped on' : 
                  currentStatus === 'Delivered' ? 'Delivered on' : 
                  currentStatus === 'Cancelled' ? 'Cancelled on' : 'Updated on'}
              </Text>
              <Text style={styles.deliveryDateValue}>
                {new Date().toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            
            {/* Status Options Dropdown */}
            {showStatusOptions && (
              <View style={styles.statusOptionsContainer}>
                {['Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
                  <TouchableOpacity 
                    key={status}
                    style={[styles.statusOption, selectedStatus === status && styles.selectedStatusOption]} 
                    onPress={() => handleStatusChange(status)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusOptionText, selectedStatus === status && styles.selectedStatusOptionText]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomTabContainer}>
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => navigation.navigate('AdminTabs', {
            userName,
            userPhone,
            profileImage,
            designation,
            screen: 'AdminHome'
          })}
        >
          <Icon name="home" size={24} color="#666" />
          <Text style={styles.tabText}>{translate('Home')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, styles.activeTabButton]} 
          onPress={() => navigation.navigate('AdminTabs', {
            userName,
            userPhone,
            profileImage,
            designation,
            screen: 'AdminOrders'
          })}
        >
          <Icon name="shopping-cart" size={24} color="#09A84E" />
          <Text style={[styles.tabText, styles.activeTabText]}>{translate('Orders')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => navigation.navigate('AdminProfile', {
            userName,
            userPhone,
            profileImage,
            designation
          })}
        >
          <Icon name="user" size={24} color="#666" />
          <Text style={styles.tabText}>{translate('Profile')}</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center',
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
    flex: 1,
    textAlign: 'left'
  },
  headerSpacer: {
    width: 34, // Same width as the back button for balance
  },
  deliveryStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deliveryStatusButtonText: {
    color: '#09A84E',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  updatingButton: {
    backgroundColor: '#e0e0e0',
    borderColor: '#ccc',
  },
  updatingText: {
    color: '#666',
  },
  statusOptionsContainer: {
    position: 'absolute',
    bottom: 85, // moved up more for better visibility
    right: 20, // moved left by 20px
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
    minWidth: 100,
    maxWidth: 110,
  },
  statusOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 1,
    backgroundColor: '#f8f9fa',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  selectedStatusOption: {
    backgroundColor: '#09A84E',
  },
  selectedStatusOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 998,
  },
  scrollView: { 
    flex: 1, 
    marginTop: 88,
    marginBottom: 80 // Space for bottom tab
  },
  scrollViewContent: { 
    flexGrow: 1 
  },
  contentContainer: { 
    paddingTop: 10,
    paddingBottom: 20
  },
  orderListHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginLeft: 20,
    fontFamily: 'Montserrat',
  },
  productList: {
    gap: 0,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  productPrice: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  productQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  totalCostBox: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  orderIdBox: {
    backgroundColor: '#fff',
    padding: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderIdLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  orderIdText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  userDetailsBox: {
    backgroundColor: '#fff',
    padding: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  userDetailsHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userIcon: {
    marginRight: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  deliveryStatusBox: {
    backgroundColor: '#fff',
    padding: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  deliveryStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  deliveryStatusValue: {
    fontSize: 14,
    color: '#09A84E',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  deliveryDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryDateLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  deliveryDateValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  bottomTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  activeTabButton: {
    // Active state styling
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  activeTabText: {
    color: '#09A84E',
    fontWeight: '600',
  },
});

export default AdminOrderHandle;
