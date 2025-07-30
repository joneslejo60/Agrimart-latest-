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
  TextInput 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, AdminTabsParamList } from '../../navigation/navigation.types';
import { useLanguage } from '../../context/LanguageContext';
import { adminApi, AdminOrder } from '../../services/adminApiService';
import apiService from '../../services/apiService';

type AdminOrdersScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabsParamList, 'AdminOrders'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type AdminOrdersScreenRouteProp = RouteProp<AdminTabsParamList, 'AdminOrders'>;

const AdminOrdersScreen = () => {
  const { language, translate } = useLanguage();
  const navigation = useNavigation<AdminOrdersScreenNavigationProp>();
  const route = useRoute<AdminOrdersScreenRouteProp>();
  const { userName = '', userPhone = '', designation = 'Manager', profileImage, selectedTab: initialTab = 'all' } = route.params || {};
  
  // State for selected tab
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'new'>(initialTab);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for orders from API
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Load orders from API
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const result = await adminApi.orders.getAllOrders();
        if (result.success && result.data) {
          setOrders(result.data);
        } else {
          console.error('Failed to load orders:', result.error);
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, []);
  
  // Show status bar when AdminOrdersScreen mounts
  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#09A84E');
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);

  // Filter orders based on selected tab and search query
  const filteredOrders = orders.filter(order => {
    // Map order status to tab names
    const getStatusName = (statusId: number) => {
      // This is a simplified mapping - you might want to get this from API
      if (statusId === 1) return 'new';
      if (statusId === 2) return 'pending';
      if (statusId === 3) return 'completed';
      return 'all';
    };
    
    // First filter by selected tab
    const orderStatus = getStatusName(order.orderStatusId);
    const matchesTab = selectedTab === 'all' || orderStatus === selectedTab;
    
    // Then filter by search query (order ID or user name)
    const matchesSearch = searchQuery === '' || 
      (order.orderId != null && order.orderId.toString().includes(searchQuery)) ||
      (order.userName && order.userName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesTab && matchesSearch;
  });

  // State for user profiles (after filteredOrders is defined)
  const [userProfiles, setUserProfiles] = useState<{ [userId: string]: { name?: string; phoneNumber?: string } | null }>({});
  const [failedUserIds, setFailedUserIds] = useState<Set<string>>(new Set());
  const [addressMap, setAddressMap] = useState<{ [addressId: string]: { street?: string; city?: string; state?: string; zipCode?: string } }>({});

  // Fetch user profiles for all unique userIds in filteredOrders
  useEffect(() => {
    async function fetchUserProfiles() {
      const userIds = Array.from(new Set(filteredOrders.map(order => String(order.userId))));
      // Only fetch if not already in userProfiles and not previously failed
      const missingUserIds = userIds.filter(id => !(id in userProfiles) && !failedUserIds.has(id));
      if (missingUserIds.length === 0) return;
      const profileResults = await Promise.all(
        missingUserIds.map(async (userId) => {
          try {
            const resp = await apiService.userProfile.getById(userId);
            if (resp.success && resp.data) {
              return { userId, profile: { name: resp.data.name, phoneNumber: resp.data.phoneNumber }, failed: false };
            } else {
              return { userId, profile: null, failed: true };
            }
          } catch (e) {
            return { userId, profile: null, failed: true };
          }
        })
      );
      const newProfiles: { [userId: string]: { name?: string; phoneNumber?: string } | null } = {};
      const newFailed = new Set<string>();
      profileResults.forEach(({ userId, profile, failed }) => {
        newProfiles[userId] = profile;
        if (failed) newFailed.add(userId);
      });
      setUserProfiles(prev => ({ ...prev, ...newProfiles }));
      if (newFailed.size > 0) {
        setFailedUserIds(prev => new Set([...Array.from(prev), ...Array.from(newFailed)]));
      }
    }
    fetchUserProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders]);

  // Fetch all addresses in bulk on mount
  useEffect(() => {
    async function fetchAddresses() {
      const resp = await apiService.address.getAll(1, 1000); // adjust pageSize as needed
      if (resp.success && resp.data) {
        const map: { [addressId: string]: { street?: string; city?: string; state?: string; zipCode?: string } } = {};
        resp.data.forEach(addr => {
          map[String(addr.addressId)] = {
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zipCode
          };
        });
        setAddressMap(map);
      }
    }
    fetchAddresses();
  }, []);

  const handleGoToAdminHome = () => {
    navigation.navigate('AdminHome', {
      userName,
      userPhone,
      profileImage,
      designation
    });
  };

  const handleOrderPress = (order: AdminOrder) => {
    navigation.navigate('AdminOrderHandle', {
      userName,
      userPhone,
      profileImage,
      designation,
      orderId: order.orderId != null ? order.orderId.toString() : '',
      orderData: order
    });
  };

  const handleTabPress = (tab: 'all' | 'pending' | 'new') => {
    setSelectedTab(tab);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Render product images with +N indicator
  const renderProductImages = (products: any[]) => {
    const maxVisible = 5;
    const visibleProducts = products.slice(0, maxVisible);
    const remainingCount = products.length - maxVisible;

    return (
      <View style={styles.productImagesContainer}>
        {visibleProducts.map((product, index) => (
          <Image
            key={product.id}
            source={product.image}
            style={[
              styles.productImage,
              { zIndex: visibleProducts.length - index }
            ]}
          />
        ))}
        {remainingCount > 0 && (
          <View style={styles.remainingCountContainer}>
            <Text style={styles.remainingCountText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
    );
  };

  // Get border color based on status
  const getBorderColor = (status: string) => {
    if (selectedTab === 'all') {
      if (status === 'pending') return '#FF9500';
      if (status === 'new') return '#007AFF';
      return '#09A84E';
    }
    if (selectedTab === 'pending') return '#FF9500';
    if (selectedTab === 'new') return '#007AFF';
    return '#09A84E';
  };

  // Get cost color based on status
  const getCostColor = (status: string) => {
    if (selectedTab === 'all') {
      if (status === 'pending') return '#FF9500';
      if (status === 'new') return '#007AFF';
      return '#09A84E';
    }
    if (selectedTab === 'pending') return '#FF9500';
    if (selectedTab === 'new') return '#007AFF';
    return '#09A84E';
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} hidden={false} />

      {/* Header - like PrivacyPolicyScreen */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoToAdminHome} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Orders')}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                selectedTab === 'all' && styles.selectedTabButton
              ]}
              onPress={() => handleTabPress('all')}
            >
              <Text style={[
                styles.tabText,
                selectedTab === 'all' && styles.selectedTabText
              ]}>
                {translate('All')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                selectedTab === 'pending' && styles.selectedTabButton
              ]}
              onPress={() => handleTabPress('pending')}
            >
              <Text style={[
                styles.tabText,
                selectedTab === 'pending' && styles.selectedTabText
              ]}>
                {translate('Pending')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                selectedTab === 'new' && styles.selectedTabButton
              ]}
              onPress={() => handleTabPress('new')}
            >
              <Text style={[
                styles.tabText,
                selectedTab === 'new' && styles.selectedTabText
              ]}>
                {translate('New')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={16} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={translate('Search by product name...')}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Icon name="times" size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, index) => (
              <TouchableOpacity 
                key={`${order.orderId}-${index}`}
                style={[
                  styles.orderCard,
                  { borderColor: getBorderColor(order.orderStatusId != null ? order.orderStatusId.toString() : '0') }
                ]}
                onPress={() => handleOrderPress(order)}
                activeOpacity={0.7}
              >
                {/* Order ID and Cost */}
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order ID: {order.orderId || 'N/A'}</Text>
                  <Text style={[styles.orderCost, { color: getCostColor(order.orderStatusId != null ? order.orderStatusId.toString() : '0') }]}>₹{order.totalAmount || 0}</Text>
                </View>
                {/* Order Items Info */}
                <View style={styles.orderItemsContainer}>
                  <Text style={styles.orderItemsText}>
                    {order.orderItems ? `${order.orderItems.length} items` : 'Order items'}
                  </Text>
                  <Text style={styles.orderDateText}>
                    {new Date(order.orderDate).toLocaleDateString()}
                  </Text>
                </View>
                {/* Separator Line */}
                <View style={styles.separator} />
                {/* User Info */}
                <View style={styles.userInfoContainer}>
                  <View style={styles.userDetailsContainer}>
                    <View style={styles.nameContainer}>
                      <Icon name="user" size={12} color="#333" style={styles.nameIcon} />
                      <Text style={styles.userName}>{userProfiles[String(order.userId)]?.name || 'Customer'}</Text>
                    </View>
                    <View style={styles.phoneContainer}>
                      <Icon name="phone" size={12} color="#333" style={styles.phoneIcon} />
                      <Text style={styles.phoneText}>{userProfiles[String(order.userId)]?.phoneNumber || 'N/A'}</Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <Text style={styles.statusText}>
                      {addressMap[String(order.shippingAddressId)]
                        ? `${addressMap[String(order.shippingAddressId)].street || ''}, ${addressMap[String(order.shippingAddressId)].city || ''}, ${addressMap[String(order.shippingAddressId)].state || ''}, ${addressMap[String(order.shippingAddressId)].zipCode || ''}`
                        : 'Loading address...'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="shopping-cart" size={50} color="#ccc" />
              <Text style={styles.emptyStateText}>{translate('No orders found')}</Text>
              <Text style={styles.emptyStateSubtext}>
                {translate('Orders placed by customers will appear here')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  backButton: { marginRight: 10 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  scrollView: { flex: 1, marginTop: 88 },
  scrollViewContent: { 
    flexGrow: 1 
  },
  contentContainer: { 
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    marginHorizontal: -20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTabButton: {
    borderWidth: 2,
    borderColor: '#09A84E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Montserrat',
  },
  selectedTabText: {
    color: '#09A84E',
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  clearButton: {
    padding: 4,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  orderCost: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    marginTop: -2,
  },
  productImagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 4,
  },
  remainingCountContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  remainingCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'Montserrat',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  userDetailsContainer: {
    flex: 1,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
    flex: 1,
    marginLeft: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  nameIcon: {
    marginRight: 4,
  },
  addressIcon: {
    marginRight: 4,
    marginTop: 1,
  },
  addressText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIcon: {
    marginRight: 4,
  },
  phoneText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  orderItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  orderItemsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  orderDateText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: '#09A84E',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 100 
  },
  emptyStateText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 20, 
    color: '#666',
    fontFamily: 'Montserrat'
  },
  emptyStateSubtext: { 
    fontSize: 14, 
    color: '#999', 
    textAlign: 'center', 
    marginTop: 10,
    fontFamily: 'Montserrat'
  }
});

export default AdminOrdersScreen;