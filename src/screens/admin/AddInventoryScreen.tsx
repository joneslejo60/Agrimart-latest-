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

type AddInventoryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddInventory'>;
type AddInventoryRouteProp = RouteProp<RootStackParamList, 'AddInventory'>;

const mockUploadImageToServer = async (localUri: string): Promise<string> => {
  // Simulate uploading and returning a public URL
  // In real use, replace with actual upload logic (e.g., to S3, Firebase, etc.)
  return Promise.resolve(
    'https://your-image-server.com/uploads/' + encodeURIComponent(localUri.split('/').pop() || 'image.jpg')
  );
};

const AddInventoryScreen = () => {
  const { language, translate } = useLanguage();
  const navigation = useNavigation<AddInventoryNavigationProp>();
  const route = useRoute<AddInventoryRouteProp>();
  const { 
    userName = '', 
    userPhone = '', 
    designation = 'Manager', 
    profileImage
  } = route.params || {};

  // Form state - all fields start empty for new product
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [productImage, setProductImage] = useState<{ uri: string } | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await adminApi.categories.getAll();
        if (result.success && result.data) {
          setCategories(result.data);
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
  }, []);

  // Show status bar when AddInventoryScreen mounts
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

  const handleCreateProduct = async () => {
    // Validate required fields
    if (!selectedCategory || !productName || !price || !stockQuantity) {
      Alert.alert('Error', 'Please fill in all required fields (Category, Name, Price, Stock Quantity)');
      return;
    }
    
    try {
      setLoading(true);
      
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
      
      const newProductData: Omit<AdminProduct, 'productId'> = {
        name: productName,
        description: finalDescription,
        price: parseFloat(price),
        stockQuantity: parseInt(stockQuantity),
        categoryId: selectedCategoryObj.id,
        unitOfMeasure: weight,
        isActive: true,
        imageUrl: productImage?.uri || undefined
      };
      
      console.log('🆕 Creating new product with data:', newProductData);
      console.log('🆕 Sending product data to /api/Manager/products:', JSON.stringify(newProductData)); //ADD THIS LINE
      const result = await adminApi.products.create(newProductData);
      
      if (result.success) {
        Alert.alert('Success', 'Product created successfully!', [
          {
            text: 'OK',
            onPress: () => handleGoToAdminInventory()
          }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName || newCategoryName.trim() === '') {
      Alert.alert('Error', 'Category name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const newCategory = {
        id: 0,
        name: newCategoryName.trim(),
        description: `Category created by ${designation}`
      };

      const result = await adminApi.categories.create(newCategory);
      
      if (result.success && result.data) {
        // Add to local categories list
        setCategories(prev => [...prev, result.data!]);
        setSelectedCategory(result.data.name);
        setNewCategoryName('');
        setShowAddCategory(false);
        Alert.alert('Success', 'Category created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create category');
    } finally {
      setLoading(false);
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
        <Text style={styles.headerText}>Add New Product</Text>
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

          {/* Add Category Section */}
          {!showAddCategory ? (
            <TouchableOpacity 
              style={styles.addCategoryButton}
              onPress={() => setShowAddCategory(true)}
            >
              <Icon name="add-circle-outline" size={20} color="#09A84E" />
              <Text style={styles.addCategoryText}>Add Category</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addCategoryInputContainer}>
              <View style={styles.categoryInputRow}>
                <TextInput
                  style={styles.categoryInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Enter category name"
                  placeholderTextColor="#999"
                  autoFocus
                />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleCreateCategory}
                  disabled={loading}
                >
                  <Icon name="add" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  <Icon name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          )}

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
              <Text style={styles.pricePrefix}>Price: ₹</Text>
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

          {/* Weight/Unit of Measure */}
          <View style={styles.inputContainer}>
            <View style={styles.weightInputContainer}>
              <Text style={styles.weightPrefix}>Unit:</Text>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g., kg, grams, pieces"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Stock Quantity */}
          <View style={styles.inputContainer}>
            <View style={styles.quantityInputContainer}>
              <Text style={styles.quantityPrefix}>Stock Quantity:</Text>
              <TextInput
                style={styles.quantityInput}
                value={stockQuantity}
                onChangeText={setStockQuantity}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
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
          <Text style={styles.sectionHeading}>Dimensions (Optional)</Text>

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
                  keyboardType="numeric"
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
                  keyboardType="numeric"
                />
              </View>
            </View>
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

          {/* Create Product Button */}
          <TouchableOpacity 
            style={[styles.createButton, loading && styles.createButtonDisabled]} 
            onPress={handleCreateProduct}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating Product...' : 'Create Product'}
            </Text>
          </TouchableOpacity>
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
  scrollView: { flex: 1, marginTop: 88 },
  scrollViewContent: { 
    flexGrow: 1,
    paddingBottom: 30
  },
  contentContainer: { 
    padding: 20 
  },
  headingContainer: {
    marginBottom: 20,
  },
  headingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'Montserrat',
  },
  inputContainer: {
    marginBottom: 15,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontFamily: 'Montserrat',
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 400,
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  createCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  createCategoryText: {
    fontSize: 16,
    color: '#09A84E',
    fontFamily: 'Montserrat',
    marginLeft: 5,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pricePrefix: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    marginRight: 10,
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
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  weightPrefix: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    marginRight: 10,
  },
  weightInput: {
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
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityPrefix: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    marginRight: 10,
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
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontFamily: 'Montserrat',
    minHeight: 100,
  },
  dimensionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  dimensionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dimensionPrefix: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    marginRight: 10,
  },
  dimensionInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
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
  createButton: {
    backgroundColor: '#09A84E',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  addCategoryText: {
    fontSize: 16,
    color: '#09A84E',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  addCategoryInputContainer: {
    marginBottom: 15,
  },
  categoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#09A84E',
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});

export default AddInventoryScreen;