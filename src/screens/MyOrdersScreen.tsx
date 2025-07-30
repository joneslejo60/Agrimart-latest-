import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Image, ActivityIndicator, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { getOrders, Order } from '../utils/orderStorage';
import { saveCartItems } from '../utils/cartStorage';
import { orderStatusApi, OrderStatusDetail } from '../services/apiService'; // Import the orderStatus API
import userService from '../services/userService';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/apiService';

type MyOrdersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MyOrders'>;
type MyOrdersScreenRouteProp = RouteProp<RootStackParamList, 'MyOrders'>;

// Helper component to display the price
const PriceDisplay = ({ price }: { price: number }) => {
  return (
    <Text style={styles.priceText}>
      ₹{price.toFixed(2)}
    </Text>
  );
};

const MyOrdersScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<MyOrdersScreenNavigationProp>();
  const route = useRoute<MyOrdersScreenRouteProp>();
  
  const { userName, userPhone } = route.params || {};
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Simple state for orders management
  const [sampleOrders] = useState([]);

  // Use useFocusEffect to reload orders whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await orderStatusApi.getAll();
          if (response.success && response.data) {
            const transformedOrders = transformApiOrdersToAppFormat(response.data);
            setOrders(transformedOrders);
          } else {
            setError('Failed to fetch order status');
          }
        } catch (error) {
          setError('Failed to fetch order status');
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
      
      // Return cleanup function
      return () => {
        // Any cleanup code if needed
      };
    }, [])
  );
  
  // No additional functions needed for the simplified UI
  
  // Function to transform API order data to the expected format
  const transformApiOrdersToAppFormat = (apiOrders: any[]): Order[] => {
    console.log('API Orders:', JSON.stringify(apiOrders));
    if (!Array.isArray(apiOrders)) {
      console.error('API did not return an array of orders');
      return [];
    }
    
    // Only keep orders with a real orderId or id
    const filteredOrders = apiOrders.filter(apiOrder => apiOrder.orderId || apiOrder.id);
    const transformedOrders = filteredOrders.map(apiOrder => {
      console.log('Processing API Order:', JSON.stringify(apiOrder));
      // Extract date components
      let orderDate = new Date();
      let day = '';
      let monthName = '';
      let year = '';
      
      try {
        // Try to parse the date from the API
        if (apiOrder.orderDate || apiOrder.createdAt) {
          orderDate = new Date(apiOrder.orderDate || apiOrder.createdAt);
          
          // Format the date components
          day = orderDate.getDate().toString().padStart(2, '0');
          const month = (orderDate.getMonth() + 1).toString().padStart(2, '0');
          year = orderDate.getFullYear().toString();
          
          // Get month name
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
          monthName = months[orderDate.getMonth()];
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        // Use current date as fallback
        const now = new Date();
        day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        year = now.getFullYear().toString();
        
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        monthName = months[now.getMonth()];
      }
      
      // Transform items if they exist
      const items = Array.isArray(apiOrder.items) 
        ? apiOrder.items.map((item: any) => ({
            id: item.productId || item.id,
            name: item.productName || item.name,
            price: typeof item.price === 'number' ? item.price : 0,
            quantity: item.quantity || 1,
            image: item.imageUrl || item.image || require('../../assets/logo.png')
          }))
        : [];
      
      // Create the transformed order
      const order = {
        id: apiOrder.id || String(Date.now()),
        orderId: apiOrder.orderId || apiOrder.id, // No fallback
        date: apiOrder.formattedDate || `${day}/${(orderDate.getMonth() + 1).toString().padStart(2, '0')}/${year.slice(-2)}`,
        month: apiOrder.month || monthName,
        year: apiOrder.year || year,
        status: apiOrder.status || 'processing',
        items: items,
        totalAmount: apiOrder.totalAmount || apiOrder.total || 0,
        address: apiOrder.address || {},
        userId: apiOrder.userId || ''
      };
      
      console.log('Transformed Order Items:', JSON.stringify(order.items));
      return order;
    });
    
    console.log('Transformed Orders:', JSON.stringify(transformedOrders));
    return transformedOrders;
  };

  // Function to get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return '#4CAF50'; // #09A84E
      case 'processing':
      case 'confirmed':
      case 'packed':
      case 'shipped':
        return '#2196F3'; // Blue
      case 'cancelled':
      case 'failed':
        return '#F44336'; // Red
      case 'pending':
      case 'payment_pending':
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <MaterialCommunityIcons name="package-variant-closed-check" size={24} color="#4CAF50" />;
      case 'processing':
        return <MaterialCommunityIcons name="progress-clock" size={24} color="#2196F3" />;
      case 'confirmed':
        return <MaterialCommunityIcons name="check-circle-outline" size={24} color="#2196F3" />;
      case 'packed':
        return <MaterialCommunityIcons name="package-variant-closed" size={24} color="#2196F3" />;
      case 'shipped':
        return <MaterialCommunityIcons name="truck-delivery-outline" size={24} color="#2196F3" />;
      case 'cancelled':
        return <MaterialCommunityIcons name="cancel" size={24} color="#F44336" />;
      case 'failed':
        return <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#F44336" />;
      case 'pending':
      case 'payment_pending':
        return <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />;
      default:
        return <MaterialCommunityIcons name="help-circle-outline" size={24} color="#9E9E9E" />;
    }
  };

  // Group orders by month and year
  const groupedOrders = orders.reduce((acc, order) => {
    const key = `${order.month} ${order.year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const fetchOrderById = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.order.getOrderById(orderId);
      if (response.success && response.data) {
        // For demonstration, just log the order or you can set it to state
        console.log('Fetched single order:', response.data);
        // Optionally, show it in the UI or set to a state variable
        // setOrders([response.data]);
        Alert.alert('Fetched order', JSON.stringify(response.data, null, 2));
      } else {
        setError('Order not found or failed to fetch');
      }
    } catch (err) {
      setError('Error fetching order by ID');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('My Orders')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#09A84E" />
            <Text style={styles.loadingText}>{translate('Loading your orders...')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setError(null);
                orderStatusApi.getAll()
                  .then(response => {
                    if (response.success && response.data) {
                      // Transform API response to match expected Order format
                      const transformedOrders = transformApiOrdersToAppFormat(response.data);
                      setOrders(transformedOrders);
                    } else {
                      setError('Failed to fetch order status');
                    }
                  })
                  .catch(error => {
                    console.error('Error fetching order status:', error);
                    setError('Failed to fetch order status');
                  })
                  .finally(() => {
                    setLoading(false);
                  });
              }}
            >
              <Text style={styles.retryButtonText}>{translate('Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(groupedOrders).map(([monthYear, orders]) => (
            <View key={monthYear}>
              <Text style={styles.monthYearHeader}>{monthYear}</Text>
              
              {orders.map((order, index) => (
                <View key={`order-${order.id}-${order.orderId}-${index}`} style={styles.orderContainer}>
                  <View style={styles.orderHeader}>
                    {/* Removed status box */}
                    {/*
                    <View style={[
                      styles.statusBox,
                      order.status === 'delivered' ? styles.deliveredBox : 
                      order.status === 'processing' ? styles.processingBox : 
                      styles.cancelledBox
                    ]}>
                      <Text style={[
                        styles.statusText,
                        order.status === 'delivered' ? styles.deliveredText : 
                        order.status === 'processing' ? styles.processingText : 
                        styles.cancelledText
                      ]}>
                        {order.status === 'delivered' ? translate('Delivered') : 
                         order.status === 'processing' ? translate('Processing') : 
                         translate('Cancelled')}: {order.date}
                      </Text>
                    </View>
                    */}
                    <Text style={styles.orderIdText}>{translate('Order ID')}: {order.orderId}</Text>
                  </View>
                  
                  <View style={styles.separator} />
                  
                  <View style={styles.productAndButtonContainer}>
                    {order.items && order.items.length > 0 && (
                      <View style={styles.productContainer}>
                        <Image 
                          source={
                            typeof order.items[0].image === 'string' && order.items[0].image
                              ? { uri: order.items[0].image } 
                              : require('../../assets/banner1.png')
                          } 
                          style={styles.productImage} 
                        />
                        
                        <View style={styles.productDetails}>
                          <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
                            {order.items[0].name}
                            {order.items.length > 1 ? ` & ${order.items.length - 1} more` : ''}
                          </Text>
                          <Text style={styles.productQuantity}>{translate('Qty')}: {order.items[0].quantity}</Text>
                          {/* Use the helper component */}
                          <View style={styles.productPrice}>
                            <PriceDisplay price={order.items[0].price || 0} />
                          </View>
                        </View>
                      </View>
                    )}
                    
                    <TouchableOpacity 
                      style={styles.orderAgainButton} 
                      activeOpacity={0.8}
                      onPress={async () => {
                        try {
                          await saveCartItems(order.items);
                          
                          // Navigate to cart using the same navigation approach as the original
                          navigation.reset({
                            index: 0,
                            routes: [{ 
                              name: 'HomeTabs', 
                              params: { userName: userName || '', userPhone: userPhone || '' },
                              state: {
                                routes: [
                                  { name: 'Home', params: { userName: userName || '', userPhone: userPhone || '' } },
                                  { name: 'Cart', params: { 
                                    userName: userName || '', 
                                    userPhone: userPhone || '',
                                    cartItems: order.items,
                                    selectedAddress: order.address
                                  } },
                                  { name: 'Profile', params: { userName: userName || '', userPhone: userPhone || '' } }
                                ],
                                index: 1,
                              }
                            }],
                          });
                        } catch (error) {
                          console.error('Error re-ordering:', error);
                        }
                      }}
                    >
                      <Text style={styles.orderAgainText}>{translate('Order Again')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>



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
                  routes: [
                    { name: 'Home', params: { userName: userName || '', userPhone: userPhone || '' } },
                    { name: 'Cart', params: { userName: userName || '', userPhone: userPhone || '' } },
                    { name: 'Profile', params: { userName: userName || '', userPhone: userPhone || '' } }
                  ],
                  index: 1, // Cart tab index
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
                  routes: [
                    { name: 'Home', params: { userName: userName || '', userPhone: userPhone || '' } },
                    { name: 'Cart', params: { userName: userName || '', userPhone: userPhone || '' } },
                    { name: 'Profile', params: { userName: userName || '', userPhone: userPhone || '' } }
                  ],
                  index: 2, // Profile tab index
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

export default MyOrdersScreen;

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
    // paddingVertical: 20, // Removed to align orders directly below header
    paddingHorizontal: 0,
    marginTop: 88, // Added to account for absolute positioned header
  },
  
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  loadingText: {
    fontSize: 18,
    color: '#09A84E',
    textAlign: 'center',
    marginTop: 15,
  },
  
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: '#09A84E',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 📅 Month-Year Header Styles
  monthYearHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
    paddingHorizontal: 20,
  },

  // 📦 Order Container Styles
  orderContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 0,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
  },

  // 📋 Order Header Styles
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 5,
  },

  orderIdText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  separator: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },

  // 🛍️ Product and Button Container
  productAndButtonContainer: {
    flexDirection: 'column',
    paddingHorizontal: 5,
  },

  // 🛍️ Product Container Styles
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  // 🖼️ Product Image
  productImage: {
    width: 45,
    height: 45,
    borderRadius: 6,
    marginRight: 10,
  },

  // 📝 Product Details
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },

  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },

  productQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },

  productPrice: {
    // ViewStyle properties for the container
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  
  // Text style for price text (used in PriceDisplay component)
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  // 🔄 Order Again Button
  orderAgainButton: {
    backgroundColor: '#09A84E',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop: 6,
  },

  orderAgainText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  
  trackOrderButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  
  trackOrderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  closeButton: {
    padding: 5,
  },
  
  statusLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  
  statusLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  
  statusScrollContainer: {
    maxHeight: '80%',
  },
  
  statusContainer: {
    paddingBottom: 20,
  },
  
  orderNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  
  currentStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  
  deliveryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  deliveryDateText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },
  
  statusTimelineContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
    position: 'relative',
  },
  
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#09A84E',
    marginTop: 5,
    marginRight: 15,
    zIndex: 2,
  },
  
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 15,
    width: 2,
    height: '100%',
    backgroundColor: '#ddd',
    zIndex: 1,
  },
  
  timelineContent: {
    flex: 1,
  },
  
  timelineStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  
  timelineTimestamp: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  
  timelineNotes: {
    fontSize: 12,
    color: '#555',
    marginTop: 5,
    fontStyle: 'italic',
  },
  
  trackingContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  
  trackingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  
  trackingNumber: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  
  trackingButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  
  trackingButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  noStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  
  noStatusText: {
    marginTop: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  
  noteContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  
  noteText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },

  // 🧭 Bottom Navigation Styles
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
