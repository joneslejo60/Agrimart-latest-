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
import { adminApi } from '../../services/adminApiService';
import apiService from '../../services/apiService';

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
  const [productsDetails, setProductsDetails] = useState<Product[]>([]);
  const [address, setAddress] = useState<Address | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Show status bar when AdminOrderHandle mounts
  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#09A84E');
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);

  useEffect(() => {
    async function fetchDetails() {
      if (orderData && orderData.orderItems) {
        // Fetch all product details in parallel
        const productPromises = orderData.orderItems.map((item: any) =>
          adminApi.products.getById(item.productId)
        );
        const products = await Promise.all(productPromises);
        setProductsDetails(products.map(p => p.data));
      }
      if (orderData && orderData.shippingAddressId) {
        const addressResp = await apiService.address.getById(orderData.shippingAddressId);
        const addr = addressResp.data
          ? {
              addressId: addressResp.data.addressId ?? 0,
              street: addressResp.data.street ?? '',
              city: addressResp.data.city ?? '',
              state: addressResp.data.state ?? '',
              zipCode: addressResp.data.zipCode ?? ''
            }
          : null;
        setAddress(addr);
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
    // Map status string to statusId (customize as needed)
    const statusMap: { [key: string]: number } = {
      'Confirmed': 1,
      'Shipped': 2,
      'Delivered': 3,
      'Cancelled': 4
    };
    const statusId = statusMap[newStatus];
    if (!orderData?.orderId || !statusId) return;
    try {
      const result = await adminApi.orders.updateOrderStatus(orderData.orderId, { statusId: statusId, notes: '' });
      if (result && result.success !== false) {
        Alert.alert('Success', `Order status updated to ${newStatus}`);
      } else {
        Alert.alert('Error', result?.error || 'Failed to update order status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
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
            const product = productsDetails.find((p) => p && p.productId === item.productId);
            return (
              <View key={`product-${item.productId || index}`} style={styles.productItem}>
                {product?.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                ) : null}
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{product?.name || 'Product'}</Text>
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
            <Text style={styles.orderIdText}>Order ID: {orderData?.orderId || orderId || 'ORD001'}</Text>
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
              <Text style={styles.userInfoText}>{address ? `${address.street}, ${address.city}, ${address.state}, ${address.zipCode}` : 'N/A'}</Text>
            </View>
          </View>

          {/* Delivery Status */}
          <View style={styles.deliveryStatusBox}>
            <View style={styles.deliveryStatusRow}>
              <Text style={styles.deliveryStatusLabel}>Delivery Status</Text>
              <TouchableOpacity 
                style={styles.deliveryStatusButton} 
                onPress={() => setShowStatusOptions(!showStatusOptions)}
              >
                <Text style={styles.deliveryStatusButtonText}>{selectedStatus}</Text>
                <Icon name={showStatusOptions ? "chevron-up" : "chevron-down"} size={12} color="#09A84E" />
              </TouchableOpacity>
            </View>
            <View style={styles.deliveryDateRow}>
              <Text style={styles.deliveryDateLabel}>
                {selectedStatus === 'Confirmed' ? 'Confirmed on' : 
                 selectedStatus === 'Shipped' ? 'Shipped on' : 
                 selectedStatus === 'Delivered' ? 'Delivered on' : 
                 selectedStatus === 'Cancelled' ? 'Cancelled on' : 'Updated on'}
              </Text>
              <Text style={styles.deliveryDateValue}>1st June, 2025 10:00 AM</Text>
            </View>
            
            {/* Status Options Dropdown */}
            {showStatusOptions && (
              <View style={styles.statusOptionsContainer}>
                {['Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
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