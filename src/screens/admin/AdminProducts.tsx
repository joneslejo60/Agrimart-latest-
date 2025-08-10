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
  Alert,
  PermissionsAndroid
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, ImagePickerResponse, MediaType, PhotoQuality } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/navigation.types';
import { useLanguage } from '../../context/LanguageContext';
import { adminApi, AdminProduct, AdminCategory } from '../../services/adminApiService';

type AdminProductsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminProducts'>;
type AdminProductsRouteProp = RouteProp<RootStackParamList, 'AdminProducts'>;

const mockUploadImageToServer = async (localUri: string): Promise<string> => {
  // Simulate uploading and returning a public URL
  // In real use, replace with actual upload logic (e.g., to S3, Firebase, etc.)
  return Promise.resolve(
    'https://your-image-server.com/uploads/' + encodeURIComponent(localUri.split('/').pop() || 'image.jpg')
  );
};

const AdminProducts = () => {
  const { language, translate } = useLanguage();
  const navigation = useNavigation<AdminProductsNavigationProp>();
  const route = useRoute<AdminProductsRouteProp>();
  const { 
    userName = '', 
    userPhone = '', 
    designation = 'Manager', 
    profileImage,
    productId = '',
    productData = null
  } = route.params || {};

  // Form state - Map API fields correctly
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productName, setProductName] = useState(productData?.name || '');
  const [price, setPrice] = useState(productData?.price != null ? productData.price.toString() : '');
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [availableQty, setAvailableQty] = useState(productData?.stockQuantity != null ? productData.stockQuantity.toString() : '');
  const [lowStockEnabled, setLowStockEnabled] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [productImage, setProductImage] = useState(productData?.image || null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);

  // Valid categories - using original categories from database
  const VALID_CATEGORIES = [
    'UPDATED Fruits & Veggies',
    'Fruits and Vegetables', 
    'UPDATED Dairy, Cheese & Eggs',
    'UPDATED - Dairy & Fresh Eggs'
  ];

  // Load categories from API and parse product data
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await adminApi.categories.getAll();
        if (result.success && result.data) {
          setCategories(result.data);
          
          // If editing existing product, set category based on categoryId
          if (productData && productData.categoryId) {
            const productCategory = result.data.find(cat => cat.id === productData.categoryId);
            if (productCategory) {
              setSelectedCategory(productCategory.name);
            }
          }
        } else {
          console.error('Failed to load categories:', result.error);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };
    
    loadCategories();
  }, [productData]);

  // Parse description for dimensions and other fields when editing
  useEffect(() => {
    if (productData) {
      // Parse description for dimensions
      const desc = productData.description || '';
      setDescription(desc);
      
      // Extract dimensions from description if present
      const dimensionMatch = desc.match(/Dimensions:\s*Width:\s*(\d+),\s*Height:\s*(\d+)/);
      if (dimensionMatch) {
        setWidth(dimensionMatch[1]);
        setHeight(dimensionMatch[2]);
        // Remove dimensions from description for display
        const cleanDescription = desc.replace(/\n\nDimensions:.*$/, '');
        setDescription(cleanDescription);
      }
      
      // Set weight from unitOfMeasure if available
      if (productData.unitOfMeasure) {
        setWeight(productData.unitOfMeasure);
      }
      
      // Set image if available
      if (productData.imageUrl) {
        setProductImage({ uri: productData.imageUrl });
      }
    }
  }, [productData]);

  // Show status bar when AdminProducts mounts
  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#09A84E');
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);

  const handleGoToAdminInventory = () => {
    navigation.navigate('AdminTabs', {
      userName,
      userPhone,
      profileImage,
      designation,
      screen: 'AdminInventory'
    });
  };

  const handleSaveProduct = async () => {
    // Debug logging
    console.log('🔍 PRODUCT SAVE DEBUG:', {
      productId: productId,
      productIdType: typeof productId,
      isNumeric: !isNaN(parseInt(productId)),
      parsedId: parseInt(productId),
      productData: productData
    });
    
    // Validate required fields
    if (!selectedCategory || !productName || !price || !availableQty) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      // Find the selected category to get its ID
      const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);
      
      if (!selectedCategoryObj) {
        Alert.alert('Error', 'Please select a valid category');
        return;
      }

      // Prepare dimensions in description if provided
      let finalDescription = description;
      if (width && height) {
        finalDescription += `\n\nDimensions: Width: ${width}, Height: ${height}`;
      }
      
      const updatedProductData: AdminProduct = {
        name: productName,
        description: finalDescription,
        price: parseFloat(price),
        stockQuantity: parseInt(availableQty),
        categoryId: selectedCategoryObj.id,
        unitOfMeasure: weight,
        isActive: true,
        imageUrl: productImage?.uri || productData?.imageUrl || undefined
      };
      
      // Add productId to the data when updating
      if (productId && productId !== '') {
        updatedProductData.productId = productId;
      }
      
      let result;
      if (productId && productId !== '') {
        // Update existing product - pass productId as-is (can be string or number)
        console.log('🔄 Updating product with ID:', productId, 'Type:', typeof productId);
        result = await adminApi.products.update(productId, updatedProductData);
      } else {
        // Create new product (this shouldn't happen in AdminProducts screen)
        console.log('🆕 Creating new product');
        result = await adminApi.products.create(updatedProductData);
      }
      
      if (result.success) {
        Alert.alert('Success', 'Product saved successfully!');
        handleGoToAdminInventory();
      } else {
        Alert.alert('Error', result.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product. Please try again.');
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Storage Permission",
            message: "App needs access to your storage to select images.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      return true;
    }
  };

  const handleAddImage = async () => {
    const hasPermission = await requestCameraPermission();
    
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Storage permission is required to select images.');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8 as PhotoQuality,
    };

    try {
      const response: ImagePickerResponse = await launchImageLibrary(options);
      
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'Failed to pick image: ' + response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        const selectedImage = response.assets[0];
        if (selectedImage.uri) {
          // Upload the image and get a public URL
          const uploadedUrl = await mockUploadImageToServer(selectedImage.uri);
          setProductImage({ uri: uploadedUrl });
          Alert.alert('Success', 'Image selected and uploaded successfully!');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker');
      console.error('Image picker error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoToAdminInventory} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Edit Product</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Product Details Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.headingText}>Product Details</Text>
          </View>

          {/* Category Dropdown */}
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={[styles.dropdownText, !selectedCategory && styles.placeholderText]}>
                {selectedCategory || 'Select Category'}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            
            {showCategoryDropdown && (
              <ScrollView style={styles.dropdownList} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedCategory(category.name);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Product Name */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={productName}
              onChangeText={setProductName}
              placeholder="Enter product name"
              placeholderTextColor="#999"
            />
          </View>

          {/* Price */}
          <View style={styles.inputContainer}>
            <View style={styles.priceInputContainer}>
              <Text style={styles.pricePrefix}>Price:</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Weight */}
          <View style={styles.inputContainer}>
            <View style={styles.weightInputContainer}>
              <Text style={styles.weightPrefix}>Weight:</Text>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="Enter weight (grams or kg)"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter product description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Dimensions Heading */}
          <Text style={styles.sectionHeading}>Dimensions</Text>

          {/* Width and Height */}
          <View style={styles.dimensionsContainer}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <View style={styles.dimensionInputContainer}>
                <Text style={styles.dimensionPrefix}>Width:</Text>
                <TextInput
                  style={styles.dimensionInput}
                  value={width}
                  onChangeText={setWidth}
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <View style={styles.dimensionInputContainer}>
                <Text style={styles.dimensionPrefix}>Height:</Text>
                <TextInput
                  style={styles.dimensionInput}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Available Quantity */}
          <View style={styles.inputContainer}>
            <View style={styles.quantityInputContainer}>
              <Text style={styles.quantityPrefix}>Available Qty:</Text>
              <TextInput
                style={styles.quantityInput}
                value={availableQty}
                onChangeText={setAvailableQty}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Low Stock Checkbox */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity 
              style={[styles.checkbox, lowStockEnabled && styles.checkboxChecked]}
              onPress={() => setLowStockEnabled(!lowStockEnabled)}
            >
              {lowStockEnabled && <Icon name="checkmark" size={16} color="white" />}
            </TouchableOpacity>
            <Text style={styles.checkboxText}>Set minimum unit range to notify as low stock</Text>
          </View>

          {/* Add Media Heading */}
          <Text style={styles.sectionHeading}>Add Media</Text>

          {/* Media Upload */}
          <View style={styles.mediaContainer}>
            <View style={styles.imageContainer}>
              {productImage ? (
                <Image source={productImage} style={styles.uploadedImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Icon name="image-outline" size={40} color="#ccc" />
                </View>
              )}
            </View>
            
            <TouchableOpacity style={styles.addMoreButton} onPress={handleAddImage}>
              <View style={styles.addMoreIcon}>
                <Icon name="add" size={20} color="#000" />
              </View>
              <Text style={styles.addMoreText}>Add More</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProduct}>
            <Text style={styles.saveButtonText}>Save Product</Text>
          </TouchableOpacity>
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
          <Icon name="home-outline" size={24} color="#666" />
          <Text style={styles.tabText}>{translate('Home')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => navigation.navigate('AdminTabs', {
            userName,
            userPhone,
            profileImage,
            designation,
            screen: 'AdminOrders'
          })}
        >
          <Icon name="list-outline" size={24} color="#666" />
          <Text style={styles.tabText}>{translate('Orders')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, styles.activeTabButton]} 
          onPress={() => navigation.navigate('AdminTabs', {
            userName,
            userPhone,
            profileImage,
            designation,
            screen: 'AdminInventory'
          })}
        >
          <Icon name="cube-outline" size={24} color="#09A84E" />
          <Text style={[styles.tabText, styles.activeTabText]}>{translate('Inventory')}</Text>
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
    flex: 1
  },
  scrollView: { 
    flex: 1, 
    marginTop: 88,
    marginBottom: 80
  },
  scrollViewContent: { 
    flexGrow: 1 
  },
  contentContainer: { 
    padding: 20 
  },
  headingContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 120,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  pricePrefix: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    fontFamily: 'Montserrat',
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  weightPrefix: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    fontFamily: 'Montserrat',
  },
  weightInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  dimensionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dimensionPrefix: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    fontFamily: 'Montserrat',
  },
  dimensionInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  quantityPrefix: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    fontFamily: 'Montserrat',
  },
  quantityInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    minHeight: 100,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
    fontFamily: 'Montserrat',
  },
  dimensionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#09A84E',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#09A84E',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'Montserrat',
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 30,
  },
  imageContainer: {
    // No flex - just takes the space it needs
  },
  uploadedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addMoreButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    padding: 8,
  },
  addMoreIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  addMoreText: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Montserrat',
  },
  saveButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 60,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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

export default AdminProducts; 