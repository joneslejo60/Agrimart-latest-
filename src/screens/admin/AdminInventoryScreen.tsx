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
  TextInput,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, AdminTabsParamList } from '../../navigation/navigation.types';
import { useLanguage } from '../../context/LanguageContext';
import { adminApi, AdminProduct, InventoryItem } from '../../services/adminApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AdminInventoryScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabsParamList, 'AdminInventory'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type AdminInventoryScreenRouteProp = RouteProp<AdminTabsParamList, 'AdminInventory'>;

const saveCategories = async (data: string[]) => {
  try {
    await AsyncStorage.setItem('categories', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving categories:', error);
  }
};

const loadCategories = async () => {
  try {
    const data = await AsyncStorage.getItem('categories');
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading categories:', error);
    return null;
  }
};

const VALID_CATEGORIES = [
  'UPDATED Fruits & Veggies',
  'Fruits and Vegetables', 
  'UPDATED Dairy, Cheese & Eggs',
  'UPDATED - Dairy & Fresh Eggs'
];

const AdminInventoryScreen = () => {
  const { language, translate } = useLanguage();
  const navigation = useNavigation<AdminInventoryScreenNavigationProp>();
  const route = useRoute<AdminInventoryScreenRouteProp>();
  const { userName = '', userPhone = '', designation = 'Manager', profileImage } = route.params || {};
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Inventory data from API
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Load inventory and products from API
  const loadInventoryData = async () => {
    try {
      setLoading(true);
      
      // Debug: Check authentication status
      const { getAuthToken, isAuthenticated } = await import('../../services/userService');
      const token = await getAuthToken();
      const authenticated = await isAuthenticated();
      
      console.log('🔐 Auth Debug - Token exists:', !!token);
      console.log('🔐 Auth Debug - Token preview:', token ? token.substring(0, 20) + '...' : 'None');
      console.log('🔐 Auth Debug - Is authenticated:', authenticated);
      
      if (!authenticated) {
        console.error('❌ User is not authenticated! Redirecting to login...');
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => navigation.replace('AdminLogin') }
        ]);
        return;
      }
      
      const [inventoryResult, productsResult] = await Promise.all([
        adminApi.inventory.getInventory(),
        adminApi.products.getAll()
      ]);

      if (inventoryResult.success && inventoryResult.data) {
        setInventoryItems(inventoryResult.data);
        // Debug: Log first item to see field names
        if (inventoryResult.data.length > 0) {
          console.log('🔍 First inventory item fields:', Object.keys(inventoryResult.data[0]));
          console.log('🔍 First inventory item:', inventoryResult.data[0]);
        }
      } else {
        console.error('Failed to load inventory:', inventoryResult.error);
      }
      
      if (productsResult.success && productsResult.data) {
        setProducts(productsResult.data);
      } else {
        console.error('Failed to load products:', productsResult.error);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInventoryData();
    }, [])
  );
  
  // Load data asynchronously
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories from AsyncStorage or set default
        const savedCategories = await loadCategories();
        let filteredCategories;
        if (savedCategories) {
          filteredCategories = savedCategories.filter((cat: string) => VALID_CATEGORIES.includes(cat));
          setCategories(filteredCategories);
        } else {
          filteredCategories = VALID_CATEGORIES;
          setCategories(filteredCategories);
          await saveCategories(filteredCategories);
        }
        // Inventory is loaded from API, do not use fallback dummy products
        const inventoryResult = await adminApi.inventory.getInventory();
        if (inventoryResult.success && inventoryResult.data) {
          setInventoryItems(inventoryResult.data);
        } else {
          setInventoryItems([]); // Show empty state if no data
        }
      } catch (error) {
        console.error('Error loading categories or inventory:', error);
        setCategories([]);
        setInventoryItems([]); // Show empty state on error
      }
    };
    
    loadData();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const reloadData = async () => {
        const inventoryResult = await adminApi.inventory.getInventory();
        if (inventoryResult.success && inventoryResult.data) {
          setInventoryItems(inventoryResult.data);
        }
      };
      reloadData();
    }, [])
  );

  // Show status bar when AdminInventoryScreen mounts
  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#09A84E');
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);

  const handleGoToAdminHome = () => {
    navigation.navigate('AdminHome', {
      userName,
      userPhone,
      profileImage,
      designation
    });
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleProductPress = (item: InventoryItem) => {
    navigation.navigate('AdminProducts', {
      userName,
      userPhone,
      profileImage,
      designation,
      productId: item.productId,
      productData: item
    });
  };

  // Function to update inventory when returning from AdminProducts
  const updateInventoryItem = (updatedItem: InventoryItem) => {
    const updatedInventory = inventoryItems.map(item => 
      item.productId === updatedItem.productId ? updatedItem : item
    );
    setInventoryItems(updatedInventory);
  };

  // Function to add new inventory item
  const addInventoryItem = (newItem: InventoryItem) => {
    const newInventory = [...inventoryItems, newItem];
    setInventoryItems(newInventory);
  };

  // Filter inventory items based on search query
  const filteredItems = inventoryItems.filter(item => {
    const productName = item.name || '';
    return productName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} hidden={false} />

      {/* Header - like PrivacyPolicyScreen */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoToAdminHome} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Inventory')}</Text>
        <TouchableOpacity 
          style={styles.addProductButton}
          onPress={() => navigation.navigate('AddInventory', {
            userName,
            userPhone,
            profileImage,
            designation
          })}
        >
          <Text style={styles.addProductText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="search-outline" size={16} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={translate('Search Inventory')}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Inventory Items List */}
          {filteredItems.length > 0 ? (
            <View style={styles.inventoryList}>
              {filteredItems.map((item) => (
                <TouchableOpacity 
                  key={item.productId} 
                  style={[
                    styles.inventoryItem,
                    (item.stockQuantity || 0) < (item.minStockLevel || 5) && styles.lowStockItem
                  ]}
                  onPress={() => handleProductPress(item)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={require('../../assets/image.png')} 
                    style={styles.inventoryImage}
                  />
                  <View style={styles.inventoryDetails}>
                    <Text style={styles.inventoryName}>
                      {item.name || 'Unnamed Product'}
                    </Text>
                    <Text style={styles.inventoryPrice}>
                      Unit Cost - ₹{item.price || 0}
                    </Text>
                    <Text style={styles.inventoryQuantity}>
                      Available Units - {item.stockQuantity || 0}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="cube-outline" size={50} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {searchQuery ? translate('No products found') : translate('No products in inventory')}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? translate('Try a different search term') : translate('Add products to manage your inventory')}
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
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 },
  addProductButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addProductText: {
    color: '#09A84E',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  scrollView: { flex: 1, marginTop: 88 },
  scrollViewContent: { 
    flexGrow: 1 
  },
  contentContainer: { 
    padding: 0 
  },
  screenTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20,
    fontFamily: 'Montserrat'
  },
  searchContainer: {
    marginBottom: 15,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
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
  inventoryList: {
    gap: 0,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 0,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lowStockItem: {
    backgroundColor: '#ffebee', // Light red background
  },
  inventoryImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 16,
  },
  inventoryDetails: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  inventoryPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  inventoryQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
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

export default AdminInventoryScreen;