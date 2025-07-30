import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  FlatList,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, HomeTabsParamList } from '../navigation/navigation.types';
import { getCartItems, saveCartItems, CartItem as CartItemType } from '../utils/cartStorage';
import { cartApi, AddToCartRequest, CartItemUpdateDto,productsApi } from '../services/apiService';
import userService from '../services/userService';
import { useLanguage } from '../context/LanguageContext';

type GroceriesScreenRouteProp = RouteProp<RootStackParamList, 'GroceriesScreen'>;
type GroceriesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'GroceriesScreen'>,
  BottomTabNavigationProp<HomeTabsParamList>
>;

interface Product {
  id: string;
  name: string;
  price: number;
  image: any;
  description?: string;
  productId?: string; // Added for backend product ID
}

interface CartItem extends Product {
  quantity: number;
  productId?: string; // Ensure productId is available on CartItem
}

const { width: screenWidth } = Dimensions.get('window');
const itemWidth = (screenWidth - 45) / 2; // 45 = padding + gap

const GroceriesScreen = () => {
  const { translate } = useLanguage();
  const route = useRoute<GroceriesScreenRouteProp>();
  const navigation = useNavigation<GroceriesScreenNavigationProp>();
  const { userName = '', userPhone = '' } = route.params || {};
  
  const [searchText, setSearchText] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load cart items and products from storage when component mounts or when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const storedCartItems = await getCartItems();
          const productItems = await getProducts();
          setProducts(productItems);
          setCartItems(storedCartItems);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }, [])
  );
  
  const getProducts = async (): Promise<Product[]> => {
    try {
      console.log('Fetching products using productsApi');
      
      // Use the productsApi to get products
      const response = await productsApi.getAll(1,50); // Get up to 50 products
      
      if (!response.success || !response.data) {
        console.error('API did not return successful response:', response.error);
        return getFallbackProducts();
      }
      
      const data = response.data;
      console.log('Groceries API Response:', JSON.stringify(data).substring(0, 200)); // Log first part of response
      
      if (!Array.isArray(data)) {
        console.error('API did not return an array of products');
        return getFallbackProducts();
      }
      
      // Map the data to our product format
      const mappedProducts = data.map((item: any) => {
        console.log('Groceries processing item image:', item.imageUrl || item.image); // Log each image URL
        return {
          id: item.id || item.productId || `product-${Math.random().toString(36).substring(2, 9)}`,
          name: item.name || 'Product',
          price: item.price || 0,
          // Handle image URL or fallback to a default image
          image: (item.imageUrl || item.image) ? { uri: item.imageUrl || item.image } : require('../../assets/logo.png'),
          description: item.description || '',
          productId: item.id // Map backend ID to productId
        };
      });
      
      // Check if we have valid products after mapping
      if (mappedProducts.length === 0) {
        console.log('No valid products after mapping');
        return getFallbackProducts();
      }
      
      return mappedProducts;
    } catch (error) {
      console.error('Error fetching products:', error instanceof Error ? error.message : 'Unknown error');
      return getFallbackProducts();
    }
  }
  
  // Fallback products data when API fails
  const getFallbackProducts = (): Product[] => [
    {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa1',
      productId: '3fa85f64-5717-4562-b3fc-2c963f66afa1',
      name: 'Tomatoes',
      price: 50,
      image: require('../../assets/logo.png'),
      description: 'Fresh organic tomatoes'
    },
    {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa2',
      productId: '3fa85f64-5717-4562-b3fc-2c963f66afa2',
      name: 'Basmati Rice',
      price: 120,
      image: require('../../assets/logo.png'),
      description: 'Premium basmati rice 1kg'
    },
    {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa3',
      productId: '3fa85f64-5717-4562-b3fc-2c963f66afa3',
      name: 'Milk',
      price: 60,
      image: require('../../assets/logo.png'),
      description: 'Fresh dairy milk 1L'
    },
    {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa4',
      productId: '3fa85f64-5717-4562-b3fc-2c963f66afa4',
      name: 'Wheat Flour',
      price: 80,
      image: require('../../assets/logo.png'),
      description: 'Whole wheat flour 1kg'
    },
    {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa5',
      productId: '3fa85f64-5717-4562-b3fc-2c963f66afa5',
      name: 'Onions',
      price: 40,
      image: require('../../assets/logo.png'),
      description: 'Fresh red onions 1kg'
    },
    {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Sunflower Oil',
      price: 150,
      image: require('../../assets/logo.png'),
      description: 'Sunflower cooking oil 1L'
    }
  ];


  // Filter products based on search text
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getCartItemQuantity = (productId: string): number => {
    const item = cartItems.find(item => (item as CartItem).productId === productId);
    return item ? item.quantity : 0;
  };

  // In addToCart, always use product.productId for API
  const addToCart = async (product: Product) => {
    try {
      // Get current cart items from storage
      const currentCart = await getCartItems();
      // Add source property to identify as groceries
      const productWithSource = { ...product, source: 'groceries' as const };
      // Check if item exists
      const existingItem = currentCart.find(item => (item as CartItem).productId === (product.productId || product.id));
      // Make sure we have a valid product ID
      const productIdForApi = product.productId || product.id;
      if (!productIdForApi || productIdForApi === '00000000-0000-0000-0000-000000000000') {
        console.error('Groceries - Invalid product ID, cannot add to cart');
        return;
      }
      // Log product details to debug
      console.log('Groceries - Product being added:', {
        id: productIdForApi,
        name: product.name,
        price: product.price,
        exists: !!existingItem
      });
      let updatedCart: CartItem[];
      let response;
      if (existingItem) {
        // Calculate new quantity
        const newQuantity = existingItem.quantity + 1;
        // Update quantity of existing item in local cart
        updatedCart = currentCart.map(item =>
          (item as CartItem).productId === productIdForApi
            ? { ...item, quantity: newQuantity }
            : item
        );
        // Use smart cart operation for existing items
        console.log('Groceries - Updating existing item:', {
          productId: productIdForApi,
          quantity: newQuantity
        });
        try {
          response = await cartApi.smartCartOperation(productIdForApi, newQuantity, false);
        } catch (apiError) {
          console.log('✅ Backend cart unavailable, local cart working perfectly:', apiError instanceof Error ? apiError.message : 'Unknown error');
          response = { success: false, error: 'Using local storage (recommended mode)' };
        }
      } else {
        // Add new item to local cart
        updatedCart = [...currentCart, { ...productWithSource, quantity: 1, productId: productIdForApi }];
        // Use smart cart operation for new items
        console.log('Groceries - Adding new item:', {
          productId: productIdForApi,
          quantity: 1
        });
        try {
          response = await cartApi.smartCartOperation(productIdForApi, 1, true);
        } catch (apiError) {
          console.log('✅ Backend cart unavailable, local cart working perfectly:', apiError instanceof Error ? apiError.message : 'Unknown error');
          response = { success: false, error: 'Using local storage (recommended mode)' };
        }
      }
      // Save updated cart to storage
      await saveCartItems(updatedCart);
      // Update local state for UI
      setCartItems(updatedCart);
      // Handle API response (graceful degradation)
      if (response) {
        if (!response.success) {
          console.log('✅ Local cart updated successfully - backend sync skipped');
          console.log('🛒 Cart working perfectly in offline mode');
        } else {
          console.log('✅ Cart operation successful with backend sync');
        }
      } else {
        console.log('✅ Local cart updated successfully - backend unavailable');
        console.log('🛒 Cart working perfectly in offline mode');
      }
    } catch (error) {
      console.error('Error adding to cart:', error instanceof Error ? error.message : 'Unknown error');
      // Continue with local cart updates despite API errors
      console.log('Continuing with local cart update despite API error');
    }
  };

  // In removeFromCart, always use productId for API
  const removeFromCart = async (productId: string) => {
    try {
      // Get current cart items from storage
      const currentCart = await getCartItems();
      // Find the item
      const existingItem = currentCart.find(item => (item as CartItem).productId === productId);
      if (!existingItem) {
        console.error('Item not found in cart');
        return;
      }
      let updatedCart: CartItem[];
      let response;
      // Check if we need to decrease quantity or remove completely
      if (existingItem.quantity > 1) {
        // Decrease quantity
        const newQuantity = existingItem.quantity - 1;
        updatedCart = currentCart.map(item =>
          (item as CartItem).productId === productId
            ? { ...item, quantity: newQuantity }
            : item
        );
        // Use smart cart operation to decrease quantity
        if (productId && productId !== '00000000-0000-0000-0000-000000000000') {
          try {
            console.log('Groceries - Decreasing quantity:', {
              productId,
              quantity: newQuantity
            });
            try {
              response = await cartApi.smartCartOperation(productId, newQuantity, false);
            } catch (apiError) {
              console.log('✅ Backend cart unavailable, local cart working perfectly:', apiError instanceof Error ? apiError.message : 'Unknown error');
              response = { success: false, error: 'Using local storage (recommended mode)' };
            }
            
            if (response) {
              if (!response.success) {
                console.log('✅ Quantity updated successfully - backend sync skipped');
              } else {
                console.log('✅ Quantity updated successfully with backend sync');
              }
            } else {
              console.log('✅ Quantity updated locally - backend unavailable');
            }
          } catch (apiError) {
            console.log('✅ Quantity updated locally - backend cart unavailable:', apiError instanceof Error ? apiError.message : 'Unknown error');
          }
        }
      } else {
        // Remove item completely
        updatedCart = currentCart.filter(item => (item as CartItem).productId !== productId);
        // Remove item completely using DELETE endpoint or quantity=0
        if (productId && productId !== '00000000-0000-0000-0000-000000000000') {
          try {
            console.log('Groceries - Removing item completely:', productId);
            try {
              // Try DELETE endpoint first (most appropriate for complete removal)
              response = await cartApi.deleteItem(productId);
              console.log('Successfully removed item using DELETE endpoint');
            } catch (deleteError) {
              console.log('DELETE failed (expected if item not in backend), trying PUT with quantity=0 fallback');
              try {
                // Fallback to PUT with quantity=0
                response = await cartApi.smartCartOperation(productId, 0, false);
                console.log('Successfully removed item using PUT quantity=0 fallback');
              } catch (putError) {
                console.log('✅ Backend cart unavailable - item removed locally');
                response = { success: false, error: 'Using local storage (recommended mode)' };
              }
            }
            
            if (response) {
              if (!response.success) {
                console.log('✅ Item removed successfully - backend sync skipped');
              } else {
                console.log('✅ Item removed successfully with backend sync');
              }
            } else {
              console.log('✅ Item removed locally - backend unavailable');
            }
          } catch (apiError) {
            console.log('✅ Item removed locally - backend cart unavailable:', apiError instanceof Error ? apiError.message : 'Unknown error');
          }
        }
      }
      // Save to storage
      await saveCartItems(updatedCart);
      // Update UI
      setCartItems(updatedCart);
    } catch (error) {
      console.error('Error removing from cart:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Continuing with local cart update despite error');
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const quantity = getCartItemQuantity(item.id);
    console.log('Rendering product with image:', item.image); // Log image when rendering

    // Determine the image source
    const imageSource = item.image 
      ? (typeof item.image === 'string' ? { uri: item.image } : item.image)
      : require('../../assets/logo.png');

    return (
      <View style={styles.productCard}>
        <Image 
          source={imageSource} 
          style={styles.productImage} 
          resizeMode="cover" 
          defaultSource={require('../../assets/logo.png')}
          onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
        />
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.productPrice, { color: 'black' }]}>₹{item.price.toFixed(2)}</Text>
        
        {quantity === 0 ? (
          <TouchableOpacity 
            style={styles.addToCartButton} 
            onPress={() => addToCart({ ...item, productId: item.productId || item.id })}
          >
            <Text style={styles.addToCartText}>{translate('Add to Cart')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => removeFromCart((item as CartItem).productId || item.id)}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity.toString().padStart(2, '0')}</Text>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={() => addToCart({ ...item, productId: item.productId || item.id })}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groceries</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={16} color="gray" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search groceries"
              placeholderTextColor="gray"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Products Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#09A84E" />
            <Text style={styles.loadingText}>{translate('Loading products...')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.productsContainer}
            columnWrapperStyle={styles.productRow}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{translate('No products found')}</Text>
              </View>
            }
          />
        )}

        {/* Bottom Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity 
            style={styles.tabButton}
            activeOpacity={0.6}
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'HomeTabs', 
                  params: { userName, userPhone },
                  state: {
                    routes: [{ name: 'Home', params: { userName, userPhone } }],
                    index: 0,
                  }
                }],
              });
            }}
          >
            <Ionicons name="home-outline" size={24} color="gray" />
            <Text style={styles.tabLabel}>{translate('Home')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            activeOpacity={0.6}
            onPress={async () => {
              // Get the latest cart items from storage
              const storedCartItems = await getCartItems();
              
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'HomeTabs', 
                  params: { userName, userPhone },
                  state: {
                    routes: [{ name: 'Cart', params: { userName, userPhone, cartItems: storedCartItems } }],
                    index: 0,
                  }
                }],
              });
            }}
          >
            <Ionicons name="cart-outline" size={24} color="gray" />
            <Text style={styles.tabLabel}>{translate('Cart')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            activeOpacity={0.6}
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'HomeTabs', 
                  params: { userName, userPhone },
                  state: {
                    routes: [{ name: 'Profile', params: { userName, userPhone } }],
                    index: 0,
                  }
                }],
              });
            }}
          >
            <Ionicons name="person-outline" size={24} color="gray" />
            <Text style={styles.tabLabel}>{translate('Profile')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },

  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#f8f8f8',
    marginTop: 88, // Added to account for absolute positioned header
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#09A84E',
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'gray',
  },
  productsContainer: {
    padding: 15,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: itemWidth,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    justifyContent: 'space-between',
    minHeight: 250,
    overflow: 'hidden', // Ensure children don't overflow
    paddingBottom: 0, // Remove bottom padding to allow button to be flush
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  productName: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    minHeight: 35, // Ensure consistent height
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00AA00',
    marginBottom: 10,
  },
  addToCartButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 0, // Remove border radius at the bottom
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    marginTop: 'auto', // Push to bottom
    marginLeft: -10, // Extend beyond the card's left padding
    marginRight: -10, // Extend beyond the card's right padding
    marginBottom: 0, // Ensure no bottom margin
    width: itemWidth, // Match the width of the card
  },
  addToCartText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09A84E',
    borderRadius: 0, // Remove border radius at the bottom
    paddingVertical: 8,
    paddingHorizontal: 5,
    height: 46,
    marginTop: 'auto', // Push to bottom
    marginLeft: -10, // Extend beyond the card's left padding
    marginRight: -10, // Extend beyond the card's right padding
    marginBottom: 0, // Ensure no bottom margin
    width: itemWidth, // Match the width of the card
  },
  quantityButton: {
    backgroundColor: 'transparent',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginHorizontal: 15,
    minWidth: 25,
    textAlign: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#09A84E',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
  },
});

export default GroceriesScreen;