// src/screens/OrderNowScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Modal, 
  FlatList, 
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/apiService';
import { getUser, fetchCurrentUserFromApi } from '../services/userService';
import { saveCartItems } from '../utils/cartStorage';
import { getStoredOrderItems, saveOrderItems, clearOrderItems, StoredOrderItem } from '../utils/orderItemsStorage';
import { saveOrder, Order } from '../utils/orderStorage';

type OrderNowScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderNow'>;
type OrderNowScreenRouteProp = RouteProp<RootStackParamList, 'OrderNow'>;

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  unit?: string;
}

interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: string;
  units: string;
  price?: number;
}

interface Address {
  id?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string; // Changed from postalCode to match API service
  country?: string;
  isDefault?: boolean;
  userId?: string;
  // Additional fields from API service that might be needed
  fullName?: string;
  phoneNumber?: string;
  street?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  statusId?: number;
  addressId?: string; // Added for clarity if addressId is returned by the API
}

const OrderNowScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<OrderNowScreenNavigationProp>();
  const route = useRoute<OrderNowScreenRouteProp>();
  const { userName = '', userPhone = '' } = route.params || {};
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { id: '1', productName: '', quantity: '', units: '' }
  ]);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Common units for products
  const commonUnits = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'packet'];

  // Fetch products and stored order items on component mount
  useEffect(() => {
    fetchProducts();
    fetchUserAddresses();
    loadStoredOrderItems();
  }, []);
  
  // Load stored order items from AsyncStorage
  const loadStoredOrderItems = async () => {
    try {
      const storedItems = await getStoredOrderItems();
      if (storedItems && storedItems.length > 0) {
        setOrderItems(storedItems);
      }
    } catch (error) {
      console.error('Error loading stored order items:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.products.getAll(1, 100); // Get up to 100 products
      if (response.success && response.data) {
        // Map API Product to component Product interface
        const mappedProducts = response.data.map(apiProduct => ({
          id: apiProduct.productId || String(Math.random()), // Use productId as id or generate a random id if not available
          name: apiProduct.name,
          price: apiProduct.price,
          description: apiProduct.description,
          imageUrl: apiProduct.imageUrl,
          unit: 'kg' // Default unit since API doesn't provide it
        }));
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAddresses = async () => {
    try {
      // Get the user data to ensure we have the correct user ID
      let userData = await getUser();
      if (!userData || !userData.id) {
        userData = await fetchCurrentUserFromApi();
      }
      if (!userData || !userData.id) {
        console.error('User data not found or missing ID');
        return;
      }
      const currentUserId = userData.id;
      let allAddresses: Address[] = [];
      let pageNumber = 1;
      let hasMore = true;
      const pageSize = 100; // Adjust as needed
      while (hasMore) {
        const response = await apiService.address.getAll(pageNumber, pageSize);
        if (response.success && response.data) {
          // Normalize addressId to string for type compatibility
          const normalizedAddresses = response.data.map(addr => ({
            ...addr,
            addressId: addr.addressId !== undefined ? String(addr.addressId) : undefined
          }));
          allAddresses = allAddresses.concat(normalizedAddresses);
          if (response.data.length < pageSize) {
            hasMore = false;
          } else {
            pageNumber++;
          }
        } else {
          hasMore = false;
        }
      }
      // Filter addresses by userId
      const userAddresses = allAddresses.filter(addr => addr.userId === currentUserId);
      setAddresses(userAddresses);
      // Set default address if available
      const defaultAddress = userAddresses.find(addr => 
        addr.isDefault || addr.isDefaultShipping || addr.isDefaultBilling
      );
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (userAddresses.length > 0) {
        setSelectedAddress(userAddresses[0]);
      } else {
        setSelectedAddress(null);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const filterProducts = (searchText: string, itemId: string) => {
    if (!searchText.trim()) {
      setFilteredProducts([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchText.toLowerCase())
    );
    
    setFilteredProducts(filtered);
    setShowSuggestions(true);
    setActiveInputId(itemId);
  };

  const selectProduct = (product: Product, itemId: string) => {
    const updatedItems = orderItems.map(item => 
      item.id === itemId ? { 
        ...item, 
        productId: product.id,
        productName: product.name,
        units: product.unit || 'kg', // Default to kg if no unit specified
        price: product.price
      } : item
    );
    setOrderItems(updatedItems);
    saveOrderItems(updatedItems);
    setShowSuggestions(false);
  };

  const addNewRow = () => {
    const newId = (orderItems.length + 1).toString();
    const updatedItems = [...orderItems, { id: newId, productName: '', quantity: '', units: '' }];
    setOrderItems(updatedItems);
    saveOrderItems(updatedItems);
  };

  const removeRow = (id: string) => {
    if (orderItems.length > 1) {
      const updatedItems = orderItems.filter(item => item.id !== id);
      setOrderItems(updatedItems);
      saveOrderItems(updatedItems);
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string) => {
    const updatedItems = orderItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setOrderItems(updatedItems);
    saveOrderItems(updatedItems);
    
    // If updating product name, filter products for suggestions
    if (field === 'productName') {
      filterProducts(value, id);
    }
  };

  const handleSubmitOrder = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate order items
      const validItems = orderItems.filter(item => 
        item.productName.trim() !== '' && 
        item.quantity.trim() !== '' && 
        !isNaN(parseFloat(item.quantity))
      );
      
      if (validItems.length === 0) {
        Alert.alert(translate('Invalid Order'), translate('Please add at least one valid product with quantity.'));
        setIsSubmitting(false);
        return;
      }
      
      // If no address is selected, try to fetch addresses again
      if (!selectedAddress) {
        await fetchUserAddresses();
        
        // If still no address, navigate to address screen
        if (!selectedAddress) {
          Alert.alert(
            translate('No Delivery Address'),
            translate('You need to add a delivery address before placing an order.'),
            [
              { 
                text: translate('Add Address'), 
                onPress: () => navigation.navigate('MyAddress', { userName, userPhone }) 
              },
              {
                text: translate('Cancel'),
                style: 'cancel'
              }
            ]
          );
          setIsSubmitting(false);
          return;
        }
      }
      
      // Calculate total amount
      const totalAmount = validItems.reduce((sum, item) => {
        const price = item.price || 0;
        const quantity = parseFloat(item.quantity) || 0;
        return sum + (price * quantity);
      }, 0);
      
      // Get the real user ID
      let user = await getUser();
      if (!user || !user.id) {
        user = await fetchCurrentUserFromApi();
      }
      const userId = user?.id;
      if (!userId) {
        Alert.alert(translate('Authentication Error'), translate('Your session may have expired. Please log in again.'));
        setIsSubmitting(false);
        return;
      }
      
      // Make sure we have a valid address ID
      const shippingAddressId = selectedAddress?.addressId || selectedAddress?.id;
      if (!shippingAddressId) {
        console.error('Selected address has no ID');
        Alert.alert(
          translate('Invalid Address'),
          translate('Please select a valid delivery address.')
        );
        setIsSubmitting(false);
        return;
      }
      
      // Create the order object with proper types
      const orderData = {
        userId: userId, // Use the real user ID
        shippingAddressId: shippingAddressId,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        orderStatusId: "00000000-0000-0000-0000-000000000001", // Default status ID
        orderItems: validItems.map(item => ({
          productId: item.productId || item.id, // Use productId if available, otherwise use the item id
          quantity: parseFloat(item.quantity),
          price: item.price || 0,
          name: item.productName
        }))
      };
      
      // Submit order to API
      const response = await apiService.order.createOrder(orderData);
      
      if (response.success) {
        try {
          // Save order to local storage for MyOrders screen
          const now = new Date();
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
          
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear().toString().slice(2);
          const monthName = months[now.getMonth()];
          const yearFull = now.getFullYear().toString();
          
          // Create order object for local storage
          const orderId = response.data?.orderId || `ORD-${Date.now().toString().slice(-6)}`;
          const localOrder: Order = {
            id: `${orderId}-${Date.now()}`,
            orderId: orderId,
            date: `${day}/${month}/${year}`,
            month: monthName,
            year: yearFull,
            status: 'processing',
            items: validItems.map(item => ({
              id: item.productId || item.id,
              name: item.productName,
              price: item.price || 0,
              quantity: parseFloat(item.quantity),
              image: '' // No image available for manual orders
            })),
            totalAmount: totalAmount,
            address: selectedAddress || {},
            userId: user?.phoneNumber || userPhone // Use the same phone number we used for the order
          };
          
          // Save to local storage
          await saveOrder(localOrder);
          
          // Show success modal
          setShowOrderSuccess(true);
          
          // Reset form and clear stored items
          const resetItems = [{ id: '1', productName: '', quantity: '', units: '' }];
          setOrderItems(resetItems);
          clearOrderItems(); // Clear stored order items
        } catch (saveError) {
          console.error('Error saving order to local storage:', saveError);
          // Still show success since the API order was successful
          setShowOrderSuccess(true);
        }
      } else {
        Alert.alert(translate('Order Failed'), response.error || translate('Failed to create order. Please try again.'));
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert(translate('Error'), translate('An unexpected error occurred. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderSuccessClose = () => {
    // Simply close the success modal without navigating away
    setShowOrderSuccess(false);
    
    // Reset the form to allow for a new order
    const resetItems = [{ id: '1', productName: '', quantity: '', units: '' }];
    setOrderItems(resetItems);
  };

  const isProductNamePresent = () => {
    return orderItems.some(item => item.productName.trim() !== '');
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Manual Order')}</Text>
      </View>

      <ScrollView style={styles.content}>

        {/* Order Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.headerCell1}>S.N</Text>
          <Text style={styles.headerCell2}>{translate('Product Name')}</Text>
          <Text style={styles.headerCell3}>{translate('Qty')}</Text>
          <Text style={styles.headerCell4}>{translate('Units')}</Text>
          <Text style={styles.headerCell5}>{translate('Action')}</Text>
        </View>

        {orderItems.map((item, index) => (
          <View key={item.id}>
            <View style={styles.tableRow}>
              <View style={styles.cell1}>
                <Text style={styles.serialNumber}>{index + 1}</Text>
              </View>
              <View style={styles.cell2}>
                <TextInput
                  style={styles.input}
                  placeholder={translate('Enter the product name')}
                  value={item.productName}
                  onChangeText={(text) => updateItem(item.id, 'productName', text)}
                  onFocus={() => {
                    setActiveInputId(item.id);
                    if (item.productName) {
                      filterProducts(item.productName, item.id);
                    }
                  }}
                />
              </View>
              <View style={styles.cell3}>
                <TextInput
                  style={styles.input}
                  value={item.quantity}
                  onChangeText={(text) => updateItem(item.id, 'quantity', text)}
                  keyboardType="numeric"
                  placeholder={translate('Qty')}
                />
              </View>
              <View style={styles.cell4}>
                <TextInput
                  style={styles.input}
                  value={item.units}
                  onChangeText={(text) => updateItem(item.id, 'units', text)}
                  placeholder={translate('Units')}
                />
              </View>
              <View style={styles.cell5}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeRow(item.id)}
                  disabled={orderItems.length === 1}
                >
                  <Icon 
                    name="delete" 
                    size={20} 
                    color={orderItems.length === 1 ? '#ccc' : '#555'} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Product Suggestions */}
            {showSuggestions && activeInputId === item.id && filteredProducts.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <View style={{ maxHeight: 200 }}>
                  {filteredProducts.slice(0, 5).map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.suggestionItem}
                      onPress={() => selectProduct(product, item.id)}
                    >
                      <Text style={styles.suggestionText}>{product.name}</Text>
                      <Text style={styles.suggestionPrice}>₹{product.price} / {product.unit || 'kg'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            

          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addNewRow}>
          <Icon name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>{translate('Add More Products')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: isProductNamePresent() ? '#09A84E' : 'grey' }]}
          onPress={handleSubmitOrder}
          disabled={!isProductNamePresent()}
        >
          <Text style={styles.submitButtonText}>{translate('Submit Order')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('HomeTabs', { userName, userPhone, screen: 'Home' })}
        >
          <Ionicons name="home-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>{translate('Home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('HomeTabs', { userName, userPhone, screen: 'Cart' })}
        >
          <Ionicons name="cart-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>{translate('Cart')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.6}
          onPress={() => {
            // Ensure userPhone is properly formatted if it exists
            const formattedPhone = userPhone && !userPhone.startsWith('+91') 
              ? `+91 ${userPhone}` 
              : userPhone;
            
            navigation.navigate('HomeTabs', { 
              userName, 
              userPhone: formattedPhone, 
              screen: 'Profile' 
            });
          }}
        >
          <Ionicons name="person-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>{translate('Profile')}</Text>
        </TouchableOpacity>
      </View>

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
      
      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#09A84E" />
        </View>
      )}
    </View>
  );
};

export default OrderNowScreen;

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
    marginTop: 88, // Added to account for absolute positioned header
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 12,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 5,
  },
  headerCell1: { flex: 0.8, textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#555' },
  headerCell2: { flex: 3, textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#555', paddingHorizontal: 5 },
  headerCell3: { flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#555' },
  headerCell4: { flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#555' },
  headerCell5: { flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#555' },
  cell1: { flex: 0.8, alignItems: 'center', justifyContent: 'center' },
  cell2: { flex: 3, paddingHorizontal: 5 },
  cell3: { flex: 1, paddingHorizontal: 2 },
  cell4: { flex: 1, paddingHorizontal: 2 },
  cell5: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  serialNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  input: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: 'transparent',
    minHeight: 32,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Suggestions styles
  suggestionsContainer: {
    marginHorizontal: 10,
    marginTop: -5,
    marginBottom: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  suggestionPrice: {
    fontSize: 12,
    color: '#09A84E',
    fontWeight: '500',
  },
  
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#888',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30, // Increased marginBottom for more space
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  submitButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 15, // Existing margin for vertical spacing
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
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
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 280,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  successIcon: {
    marginTop: 20,
    marginBottom: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  
  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
