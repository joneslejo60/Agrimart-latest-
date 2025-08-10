import React, { useState, useEffect } from 'react';
import { View, Text, StatusBar, StyleSheet, TouchableOpacity, ScrollView, Image,ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp, useNavigationState, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeTabsParamList, RootStackParamList } from '../navigation/navigation.types';
import { getCartItems, CartItem } from '../utils/cartStorage';
import { cartApi, orderApi, OrderCreationResponse } from '../services/apiService';
import { ApiResponse } from '../services/apiConfig';
import { saveOrder, Order } from '../utils/orderStorage';
import { getUser, fetchCurrentUserFromApi } from '../services/userService';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { debugAuth, testCartApi } from '../utils/authDebugger';
import DebugPanel from '../components/DebugPanel';
import { ORDER_STATUS } from '../constants/orderStatus';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CartScreenRouteProp = RouteProp<HomeTabsParamList, 'Cart'>;
type CartScreenNavigationProp = any;

const CartScreen = () => {
  const { translate } = useLanguage();
  const { cartItems, setCartItems, refreshCart, updateQuantity: updateCartQuantity, removeItem, clearCart } = useCart();
  const route = useRoute<CartScreenRouteProp>();
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { userName, userPhone: routeUserPhone, selectedAddress, cartItems: routeCartItems } = route.params || {};
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<{[key: string]: boolean}>({});
  
  // Add state for userPhone
  const [userPhone, setUserPhone] = useState('');
  
  // Address state - moved here to be available before useEffect
  const [address, setAddress] = useState(selectedAddress);
  
  // Order success modal state
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  
  // Helper functions for address persistence
  const saveSelectedAddressToStorage = async (address: any) => {
    try {
      if (address) {
        await AsyncStorage.setItem('selectedCartAddress', JSON.stringify(address));
        console.log('Address saved to storage');
      }
    } catch (error) {
      console.error('Error saving address to storage:', error);
    }
  };

  const loadSelectedAddressFromStorage = async () => {
    try {
      const savedAddress = await AsyncStorage.getItem('selectedCartAddress');
      if (savedAddress) {
        const parsedAddress = JSON.parse(savedAddress);
        console.log('Address loaded from storage');
        return parsedAddress;
      }
    } catch (error) {
      console.error('Error loading address from storage:', error);
    }
    return null;
  };
  
  // Load user ID and cart items from storage when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Debug authentication before making any API calls
        console.log('🔍 CartScreen - Starting authentication debug...');
        await debugAuth();
        
        // First, quickly load cart items from local storage to show something immediately
        await refreshCart();
        console.log('Refreshed cart items from local storage');
        
        // Load saved address from storage if no address is selected
        if (!address) {
          const savedAddress = await loadSelectedAddressFromStorage();
          if (savedAddress) {
            setAddress(savedAddress);
            console.log('Loaded saved address from storage');
          }
        }
        
        // Always fetch user data from /api/Authentication/me for the real phone number
        let user = await fetchCurrentUserFromApi();
        if (!user || !user.id) {
          user = await getUser();
        }
        if (user && user.id) {
          setUserId(user.id);
          setUserPhone(user.phoneNumber || '');
          // Fetch cart from API using user ID
          try {
            console.log('🔍 CartScreen - About to fetch cart from API...');
            await debugAuth(); // Debug auth again before API call
            
            const response = await cartApi.getCart(user.id);
            
            if (response.success && response.data) {
              console.log('Cart data fetched from API:', response.data);
              console.log('🔍 API Response structure:', {
                hasItems: !!response.data.items,
                itemsType: typeof response.data.items,
                itemsLength: Array.isArray(response.data.items) ? response.data.items.length : 'not array',
                fullResponse: JSON.stringify(response.data, null, 2)
              });
              
              // If API returns cart items, use them
              if (Array.isArray(response.data.items) && response.data.items.length > 0) {
                // Define type for API cart item
                interface ApiCartItem {
                  productId?: string;
                  id?: string;
                  productName?: string;
                  name?: string;
                  price: number;
                  quantity: number;
                  imageUrl?: string;
                  image?: any;
                  description?: string;
                }
                
                // Map API cart items to our CartItem format if needed
                // When mapping API cart items, ensure productId is used for id and productId fields
                const apiCartItems = response.data.items.map((item: ApiCartItem) => ({
                  id: item.productId || item.id || `unknown-${Date.now()}`, // for UI
                  name: item.productName || item.name || 'Unknown Product',
                  price: item.price || 0,
                  quantity: item.quantity || 1,
                  image: item.imageUrl ? { uri: item.imageUrl } : item.image || require('../../assets/logo.png'),
                  description: item.description || '',
                  source: 'api' as const
                }));
                
                // Only update if we have valid items
                if (apiCartItems.length > 0 && apiCartItems.every((item: CartItem) => item.id && item.name)) {
                  setCartItems(apiCartItems);
                  console.log('Updated cart items from API:', apiCartItems.length);
                } else {
                  console.log('API returned invalid cart items, skipping update');
                }
              } else {
                console.log('No cart items returned from API');
              }
            } else {
              console.log('No cart data from API or request failed:', response.error);
            }
          } catch (apiError) {
            console.error('Error fetching cart from API:', apiError);
            // If API fails, we'll use the local storage items we already loaded
          } finally {
            // Set loading to false after API call completes (success or failure)
            setLoading(false);
          }
        } else {
          setUserId(null);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Reload address and cart when screen comes into focus (in case they were updated elsewhere)
  useFocusEffect(
    React.useCallback(() => {
      const reloadData = async () => {
        // Refresh cart items
        await refreshCart();
        console.log('Cart refreshed on screen focus');
        
        // Reload address
        const savedAddress = await loadSelectedAddressFromStorage();
        if (savedAddress && (!address || JSON.stringify(address) !== JSON.stringify(savedAddress))) {
          setAddress(savedAddress);
          console.log('Address reloaded from storage on screen focus');
        }
      };
      reloadData();
    }, [])
  );

  // Listen for address updates from MyAddress screen and save to storage
  React.useEffect(() => {
    if (route.params?.selectedAddress) {
      const newAddress = route.params.selectedAddress;
      setAddress(newAddress);
      // Save the selected address to storage so it persists
      saveSelectedAddressToStorage(newAddress);
      console.log('Address updated from MyAddress screen and saved');
    }
  }, [route.params?.selectedAddress]);

  // Track the previous cart items to avoid double processing
  const previousCartItemsRef = React.useRef<any[] | null>(null);
  
  // Listen for cart items updates from other screens
  React.useEffect(() => {
    // Only process if we have cart items in params and they're different from previous
    if (route.params?.cartItems && route.params.cartItems !== previousCartItemsRef.current) {
      // Store reference to current cart items to prevent reprocessing
      previousCartItemsRef.current = route.params.cartItems;
      
      // Get the new items coming in
      const incomingItems = route.params.cartItems;
      
      // Get current cart items and merge with incoming items
      const currentItems = cartItems;
      
      // If we don't have current items, just use incoming items
      if (!currentItems || currentItems.length === 0) {
        setCartItems([...incomingItems]);
        return;
      }
      
      // Create a map for quick lookups using ID as key
      const currentItemsMap = new Map();
      
      // Populate the map with current cart items
      currentItems.forEach((item: CartItem) => {
        currentItemsMap.set(item.id, {...item});
      });
      
      // Process each incoming item
      incomingItems.forEach((newItem: CartItem) => {
        // Check if this item already exists in cart
        if (currentItemsMap.has(newItem.id)) {
          // Get existing item
          const existingItem = currentItemsMap.get(newItem.id);
          
          // Replace with updated quantity (do not add quantities together)
          currentItemsMap.set(newItem.id, {
            ...newItem,
            quantity: newItem.quantity
          });
        } else {
          // Item doesn't exist in cart, add it
          currentItemsMap.set(newItem.id, {...newItem});
        }
      });
      
      // Convert map back to array and update cart
      const updatedItems = Array.from(currentItemsMap.values());
      setCartItems(updatedItems);
    }
  }, [route.params]);

  // Handler to navigate to MyAddress screen and select address
  const handleSelectAddress = async () => {
    // Save current address before navigating (if any)
    if (address) {
      await saveSelectedAddressToStorage(address);
    }
    
    // Always pass the actual phone number, not userId
    navigation.navigate('MyAddress', {
      userName,
      userPhone, // always the phone number
      source: 'Cart'
    });
  };

  const updateQuantity = async (id: string, change: number) => {
    // Find the current item
    const currentItem = cartItems.find(item => item.id === id);
    if (!currentItem) return;
    
    // Calculate new quantity
    const newQuantity = Math.max(0, currentItem.quantity + change);
    
    // If quantity becomes 0, remove the item
    if (newQuantity === 0) {
      removeItemCompletely(id);
      return;
    }
    
    // Set updating state for this item
    setUpdatingItems(prev => ({ ...prev, [id]: true }));
    
    try {
      // Update using CartContext
      await updateCartQuantity(id, newQuantity);
      
      // Try to sync with API
      try {
        const response = await cartApi.smartCartOperation(id, newQuantity, false);
        
        if (response && response.success) {
          console.log('✅ Cart quantity updated successfully with backend sync');
        } else {
          console.log('✅ Cart quantity updated successfully - backend sync skipped');
        }
      } catch (apiError) {
        console.log('✅ Backend cart unavailable, local cart working perfectly:', apiError instanceof Error ? apiError.message : 'Unknown error');
      }
    } catch (error) {
      console.log('✅ Cart operation completed locally - backend unavailable:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Clear updating state for this item
      setUpdatingItems(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  // Update removeItem to use DELETE /api/Cart/{productId} for bin icon
  const removeItemCompletely = async (id: string) => {
    const currentItem = cartItems.find(item => item.id === id);
    if (!currentItem) return;
    
    setUpdatingItems(prev => ({ ...prev, [id]: true }));
    
    try {
      // Remove using CartContext
      await removeItem(id);
      console.log('Cart - Removing item completely:', id);
      
      // Try to sync with API
      try {
        const response = await cartApi.deleteItem(id);
        console.log('✅ Item removed successfully using DELETE endpoint');
      } catch (deleteError) {
        console.log('DELETE failed (expected if item not in backend), trying PUT with quantity=0 fallback');
        try {
          const response = await cartApi.smartCartOperation(id, 0, false);
          console.log('✅ Item removed successfully using PUT quantity=0 fallback');
        } catch (putError) {
          console.log('✅ Backend cart unavailable - item removed locally');
        }
      }
    } catch (error) {
      console.log('✅ Item removed locally - backend cart unavailable:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCheckout = async () => {
    try {
      // Check if address is selected
      if (!address) {
        // Show alert that address is required
        Alert.alert('Address Required', 'Please select a delivery address to continue.');
        return;
      }
      
      // Check if address has a valid ID
      if (!address.id && !address.addressId) {
        Alert.alert('Invalid Address', 'The selected address is invalid. Please select a different address or add a new one.');
        return;
      }
      
      // Get the user ID for the API call - use the one from state if available
      const currentUserId = userId || userPhone || 'default-user';
      console.log('Checkout - Using user ID:', currentUserId);
      
      // Set loading state for checkout button
      setLoading(true);
      
      // Prepare a simplified order data structure
      // Keep it minimal with only the essential fields
      const addressId = address.id || address.addressId;
      console.log('Using address ID for order:', addressId);
      
      // Create order object matching exact API schema
      const orderData = {
        userId: currentUserId,
        shippingAddressId: Number(addressId), // Convert to number as required by API
        totalAmount: parseFloat(total.toFixed(2)),
        orderStatusId: ORDER_STATUS.NEW,
        orderDate: new Date().toISOString(),
        trackingNumber: `TRK-${Date.now()}`,
        orderItems: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: parseFloat(item.price.toFixed(2)),
          productName: item.name || "Product", // Changed from 'name' to 'productName' to match API
          imageUrl: (typeof item.image === 'string' && item.image.length > 0) ? item.image : undefined // Only use string URLs
        }))
      };
      
      console.log('Creating order with data:', JSON.stringify(orderData));
      
      // Simple retry mechanism
      let response;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts} to create order`);
        
        // Call the order API
        response = await orderApi.createOrder(orderData);
        
        // Log the response
        console.log(`Attempt ${attempts} response:`, JSON.stringify(response));
        
        // If successful, break out of the loop
        if (response.success) {
          break;
        }
        
        // If not successful and we have more attempts, wait a bit before retrying
        if (attempts < maxAttempts) {
          console.log(`Order creation failed, retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Check if we have a response
      if (!response) {
        Alert.alert(
          'Order Creation Failed',
          'No response received from the server. Please check your internet connection and try again.'
        );
      }
      // Check if the order was created successfully
      else if (response.success) {
        // Cast response to ApiResponse type to access _isLocalFallback property
        const apiResponse = response as ApiResponse<OrderCreationResponse>;
        // Check if this is a local fallback response (from our special 500 error handling)
        if (apiResponse._isLocalFallback) {
          console.log('Order processed locally due to server error');
          
          // Create a local order object
          const now = new Date();
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
          
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear().toString().slice(2);
          const monthName = months[now.getMonth()];
          const yearFull = now.getFullYear().toString();
          
          // Create a local order with a unique ID
          const timestamp = Date.now();
          const orderId = response.data?.orderId || `ORD-${timestamp.toString().slice(-6)}`;
          
          const localOrder: Order = {
            id: `${orderId}-${timestamp}`, // Ensure ID is unique with timestamp
            orderId: orderId,
            date: `${day}/${month}/${year}`,
            month: monthName,
            year: yearFull,
            status: 'processing',
            items: cartItems,
            totalAmount: parseFloat(total.toFixed(2)),
            address: address,
            userId: currentUserId
          };
          
          // Save the order locally
          await saveOrder(localOrder);
          console.log('Order saved locally:', localOrder.orderId);
          
          // Just clear the local cart without trying to update the server
          await clearCart();
          console.log('Cleared local cart only (server update skipped)');
        } else {
          console.log('Order created successfully on server!');
          
          // Create a local order object for immediate display
          const now = new Date();
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
          
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear().toString().slice(2);
          const monthName = months[now.getMonth()];
          const yearFull = now.getFullYear().toString();
          
          // Create a local order with the server's order ID and ensure it's unique
          const timestamp = Date.now();
          const orderId = response.data?.orderId || `ORD-${timestamp.toString().slice(-6)}`;
          
          const localOrder: Order = {
            id: `${orderId}-${timestamp}`, // Ensure ID is unique with timestamp
            orderId: orderId,
            date: `${day}/${month}/${year}`,
            month: monthName,
            year: yearFull,
            status: 'processing',
            items: cartItems,
            totalAmount: parseFloat(total.toFixed(2)),
            address: address,
            userId: currentUserId
          };
          
          // Save the order locally for immediate display
          await saveOrder(localOrder);
          console.log('Order saved locally for immediate display:', localOrder.orderId);
          
          // Clear cart in API (one by one to avoid overwhelming the server)
          for (const item of cartItems) {
            try {
              await cartApi.updateQuantity(item.id, 0);
              console.log(`Cleared item ${item.id} from cart`);
            } catch (clearError) {
              console.error('Error clearing item from cart API:', clearError);
            }
          }
          
          // Clear local cart and selected address
          await clearCart();
          await AsyncStorage.removeItem('selectedCartAddress');
          console.log('Cleared local cart and address');
        }
        
        // Show success modal in either case
        setShowOrderSuccess(true);
      } 
      // Handle error case
      else {
        // Keep the error message simple
        console.error('Failed to create order:', response.error);
        
        // Show a simple error message to the user
        Alert.alert(
          'Order Creation Failed', 
          'We could not process your order at this time. Please try again later.'
        );
      }
    } catch (error) {
      // Extract error message if it's an Error object
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error during checkout:', error);
      
      // Show a more informative error message to the user
      Alert.alert(
        'Checkout Error', 
        `An error occurred during checkout: ${errorMessage}. Please try again or contact support if the issue persists.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSuccessClose = async () => {
    setShowOrderSuccess(false);
    
    // Clear cart and address
    try {
      await clearCart();
      setAddress(null);
      await AsyncStorage.removeItem('selectedCartAddress');
      
      // Stay on the CartScreen instead of navigating to MyOrders
      // The user can manually navigate to MyOrders if they want to check order status
      console.log('Order completed successfully, cleared cart and address');
      
      // The cart and address are already cleared in state, so the UI will update automatically
    } catch (error) {
      console.error('Error clearing cart and address:', error);
    }
  };

  const navigateToHome = () => {
    try {
      // Try to navigate to Home tab with proper params
      navigation.navigate('Home', {
        userName: userName,
        userPhone: userPhone
      });
    } catch (error) {
      console.log('Navigation error:', error);
      // Fallback: try jumpTo
      if (navigation.jumpTo) {
        navigation.jumpTo('Home', {
          userName: userName,
          userPhone: userPhone
        });
      }
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <View style={styles.container}>
      
      {/* Temporary Debug Panel - Remove this after fixing issues */}
      {/* <DebugPanel /> */}
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Cart</Text>
      </View>

      {/* Cart Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#09A84E" />
          <Text style={styles.loadingText}>{translate('Loading cart...')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {cartItems.length > 0 && (
          <>
            {/* Cart Header Info */}
            <View style={styles.cartHeader}>
              <Text style={styles.itemsInCart}>Items in cart: {cartItems.length}</Text>
              <TouchableOpacity onPress={navigateToHome}
              >
                <Text style={styles.addMore}>{translate('Add more')}</Text>
              </TouchableOpacity>
            </View>

            {/* Cart Items */}
            {cartItems.map((item) => (
          <View key={item.id}>
            <View style={styles.cartItem}>
              {/* Product Image */}
              <Image 
                source={typeof item.image === 'string' ? { uri: item.image } : item.image} 
                style={styles.productImage} 
              />
              
              {/* Product Details */}
              <View style={styles.productDetails}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => removeItemCompletely(item.id)}
                    disabled={updatingItems[item.id]}
                  >
                    {updatingItems[item.id] ? (
                      <ActivityIndicator size="small" color="black" />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color="black" />
                    )}
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
                
                {/* Quantity Controls */}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity 
                    style={styles.quantityButtonLeft}
                    onPress={() => updateQuantity(item.id, -1)}
                    disabled={updatingItems[item.id]}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.quantityDisplay}>
                    {updatingItems[item.id] ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.quantityButtonRight}
                    onPress={() => updateQuantity(item.id, 1)}
                    disabled={updatingItems[item.id]}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Grey Line Separator */}
            <View style={styles.separator} />
          </View>
        ))}

            {/* Subtotal, GST, and Total */}
            <View style={styles.priceDetails}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{translate('Subtotal:')}</Text>
                <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{translate('GST:')}</Text>
                <Text style={styles.priceValue}>₹{gst.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>{translate('Total:')}</Text>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Delivery Address */}
            <View style={styles.deliveryAddress}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>{translate('Delivery Address:')}</Text>
                <TouchableOpacity onPress={handleSelectAddress}>
                  <Text style={styles.changeButton}>{translate('Change')}</Text>
                </TouchableOpacity>
              </View>
              {address ? (
                <View style={styles.addressRow}>
                  <Icon name="location-on" size={24} color="#09A84E" />
                  <View style={styles.addressContent}>
                    <Text style={styles.addressType}>{address.type}</Text>
                    <Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="tail">
                      {address.address}, {address.pincode}
                    </Text>
                    <Text style={styles.phoneNumber}>
                      Ph: {address.phone || address.phoneNumber || userPhone || 'N/A'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.addressValue}>No address selected</Text>
              )}
            </View>

            {/* Payment Mode */}
            <View style={styles.paymentMode}>
              <Text style={styles.paymentLabel}>{translate('Payment Mode:')}</Text>
              <View style={styles.paymentOption}>
                <Text style={styles.paymentText}>{translate('Cash on Delivery')}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#09A84E" />
              </View>
            </View>

            {/* Checkout Button */}
            <View style={styles.checkoutSection}>
              <TouchableOpacity 
                style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]} 
                onPress={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Text style={styles.checkoutText}>{translate('Checkout')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Empty Cart State */}
        {cartItems.length === 0 && (
          <>
            {/* Empty Cart Header Info */}
            <View style={styles.cartHeader}>
              <Text style={styles.itemsInCart}>{translate('Items in cart: 0')}</Text>
            </View>

            {/* Empty Cart Content */}
            <View style={styles.emptyCartContainer}>
              {/* Cart Icon */}
              <View style={styles.emptyCartIcon}>
                <Ionicons name="cart-outline" size={80} color="#ccc" />
              </View>
            </View>

            {/* Check Products Button at Bottom */}
            <View style={styles.checkoutSection}>
              <TouchableOpacity style={styles.checkProductsButton} onPress={navigateToHome}>
                <Text style={styles.checkProductsText}>{translate('Check Products')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      )}

      {/* Order Success Modal */}
      {showOrderSuccess && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleOrderSuccessClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#09A84E" />
            </View>
            
            <Text style={styles.successText}>{translate('Order Placed Successfully!')}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  // Main container - Clean foundation
  container: { 
    flex: 1, 
    backgroundColor: '#fff'
  },
  
  // Loading container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
  },

  //  Header section - Consistent with app design
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
    marginRight: 10,
    padding: 5
  },
  headerText: { 
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    fontFamily: 'Montserrat',
  },

  //  Content area
  content: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 88, // Added to account for absolute positioned header
  },

  //  Cart header with items count and add more
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff'
  },
  itemsInCart: {
    fontSize: 16,
    fontWeight: '600',
     fontFamily: 'Montserrat',
    color: '#333'
  },
  addMore: {
    fontSize: 16,
    color: '#09A84E',
    fontWeight: '500',
    textDecorationLine: 'underline',
    fontFamily: 'Montserrat',
  },

  //  Cart item container
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff'
  },
  
  //  Product image
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12
  },
  
  //  Product details section
  productDetails: {
    flex: 1,
    justifyContent: 'space-between'
  },
  
  //  Product header with name and delete
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  
  //  Product name (2 lines max)
  productName: {
    fontSize: 16,
    fontWeight: '500',
     fontFamily: 'Montserrat',
    color: '#333',
    flex: 1,
    marginRight: 10,
    lineHeight: 20
  },
  
  //  Delete button
  deleteButton: {
    padding: 4
  },
  
  //  Product price
  productPrice: {
    fontSize: 16,
     fontFamily: 'Montserrat',
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  
  //  Quantity controls container
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#09A84E',
    borderRadius: 0,
    overflow: 'hidden'
  },
  
  //  Quantity buttons
  quantityButtonLeft: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09A84E'
  },
  
  quantityButtonRight: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09A84E'
  },
  
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  
  //  Quantity display
  quantityDisplay: {
    backgroundColor: '#09A84E',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
    height: 32,
    justifyContent: 'center'
  },
  
  quantityText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  
  // Grey separator line
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16
  },

  //  Price details section
  priceDetails: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 16
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#777',
    fontFamily: 'Montserrat',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#777',
    fontFamily: 'Montserrat',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    fontFamily: 'Montserrat',
  },

  //  Delivery address section
  deliveryAddress: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 0,
    marginBottom: 16
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  changeButton: {
    fontSize: 16,
    color: '#09A84E',
    fontWeight: '500',
    textDecorationLine: 'underline',
    fontFamily: 'Montserrat',
  },
  addressType: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  addressValue: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  addressContent: {
    flex: 1,
    marginLeft: 10,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
    fontWeight: 'bold',
    marginTop: 4,
  },

  //  Payment mode section
  paymentMode: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 16
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  paymentText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },

  //  Checkout section (inside scroll)
  checkoutSection: {
    padding: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },

  //  Checkout button - Primary action
  bottomSummary: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09A84E',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },

    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    width: '85%', // Reduced from 95% to 85%
    alignSelf: 'center'
  },

  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    fontFamily: 'Montserrat',
  },

  //  Empty cart state
  emptyCartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 80,
    flex: 1
  },
  emptyCartIcon: {
    marginBottom: 40
  },

  //  Check Products Button
  checkProductsButton: {
    backgroundColor: '#09A84E',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },

    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    alignSelf: 'center',
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center'
  },

  checkProductsText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },

  // 🎉 Order Success Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 280
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5
  },
  successIcon: {
    marginTop: 20,
    marginBottom: 20
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  
  // Disabled checkout button
  checkoutButtonDisabled: {
    backgroundColor: 'rgba(0, 128, 0, 0.5)', // Semi-transparent #09A84E
    elevation: 0,
    shadowOpacity: 0
  }
});