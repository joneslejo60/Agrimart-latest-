import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Image, ScrollView, Dimensions, Platform, ActivityIndicator, Modal, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import apiService, { Address, Category } from '../services/apiService';
import { API_BASE_URL } from '../services/apiConfig';
import userService, { fetchCurrentUserFromApi } from '../services/userService';
import { useLanguage, Language } from '../context/LanguageContext';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, HomeTabsParamList } from '../navigation/navigation.types';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<HomeTabsParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type HomeScreenRouteProp = RouteProp<HomeTabsParamList, 'Home'>;

const HomeScreen = () => {
  const { language, setLanguage, translate } = useLanguage();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const { userName = '', userPhone = '' } = route.params || {};
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // State for addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [formattedUserPhone, setFormattedUserPhone] = useState<string>('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [customerServiceNumber, setCustomerServiceNumber] = useState('+91 9945356606');
  
  // State for categories
  const [agriInputCategories, setAgriInputCategories] = useState<Category[]>([]);
  const [groceriesCategories, setGroceriesCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const { width: screenWidth } = Dimensions.get('window');
  
  // Format the user phone number for API calls
  useEffect(() => {
    if (userPhone) {
      // Check if userPhone is actually a UUID (from user ID)
      const isUuid = userPhone.includes('-');
      
      let formatted = userPhone;
      if (isUuid) {
        // For UUIDs, we need to ensure it's not too long for the API (max 20 chars)
        // Use just the first part (before the first dash) to stay under 20 chars
        formatted = userPhone.split('-')[0] || userPhone.substring(0, 20);
        console.log('Using shortened identifier for UUID:', formatted);
      } else {
        // For regular phone numbers, format by removing spaces and country code
        formatted = userPhone.replace(/\s+/g, '');
        if (formatted.startsWith('+91')) {
          formatted = formatted.substring(3);
        }
      }
      
      // Ensure it's not longer than 20 characters (API limit)
      if (formatted.length > 20) {
        formatted = formatted.substring(0, 20);
      }
      
      setFormattedUserPhone(formatted);
    }
  }, [userPhone]);

  // Function to refresh addresses - can be called manually
  const refreshAddresses = React.useCallback(async () => {
    console.log('🔄 ==========================================');
    console.log('🔄 REFRESHING ADDRESSES - START');
    console.log('🔄 ==========================================');
    setLoadingAddress(true);
    try {
      // Get the real user ID
      let user = await userService.getUser();
      if (!user || !user.id) {
        user = await fetchCurrentUserFromApi();
      }
      const userId = user?.id;
      if (!userId) {
        console.log('🏠 No user ID found, cannot fetch addresses');
        setAddresses([]);
        setDefaultAddress(null);
        setLoadingAddress(false);
        return;
      }
      
      console.log('🏠 Fetching addresses for user:', userId);
      const response = await apiService.address.getUserAddresses(userId);
      
      if (response.success && response.data) {
        // Map the API response to the format expected by the UI
        const mappedAddresses = response.data.map((addr: any) => ({
          ...addr,
          // Ensure ID fields are properly set
          id: addr.id || addr.addressId || addr.Id,
          addressId: addr.addressId || addr.id || addr.Id,
          // Ensure UI-specific fields are set
          type: addr.type || addr.addressLine2 || 'Home',
          address: addr.address || addr.addressLine1 || addr.street || '',
          city: addr.city || addr.cityName || '',
          state: addr.state || addr.stateName || '',
          pincode: addr.pincode || addr.zipCode || addr.postalCode || '',
          phone: addr.phone || addr.phoneNumber || (user ? user.phoneNumber : ''),
          isDefault: addr.isDefault || addr.isDefaultShipping || false,
          // Keep original fields for debugging
          _original: addr
        }));
        
        setAddresses(mappedAddresses);
        
        // Find the default address with enhanced debugging
        console.log('🏠 All addresses:', mappedAddresses.map(addr => ({ 
          id: addr.id, 
          addressId: addr.addressId,
          address: addr.address, 
          isDefault: addr.isDefault,
          isDefaultShipping: addr.isDefaultShipping,
          _originalId: addr._original?.id,
          _originalAddressId: addr._original?.addressId
        })));
        
        // Debug: Show first address in full detail
        if (mappedAddresses.length > 0) {
          console.log('🔍 FULL FIRST ADDRESS:', JSON.stringify(mappedAddresses[0], null, 2));
          console.log('🔍 ORIGINAL FIRST ADDRESS:', JSON.stringify(mappedAddresses[0]._original, null, 2));
        }
        
        // PRIORITY 1: Check if user has manually selected a default address
        let defaultAddr: any = null;
        try {
          const storedDefaultId = await AsyncStorage.getItem('defaultAddressId');
          if (storedDefaultId) {
            console.log('🎯 Looking for user-selected default address ID:', storedDefaultId);
            defaultAddr = mappedAddresses.find((addr: any) => 
              String(addr.addressId) === storedDefaultId || 
              String(addr.id) === storedDefaultId
            );
            if (defaultAddr) {
              console.log('🎯 ✅ Found user-selected default address:', {
                id: defaultAddr.addressId,
                address: defaultAddr.address
              });
            } else {
              console.log('🎯 ❌ User-selected address not found, falling back to API flags');
            }
          }
        } catch (error) {
          console.log('🎯 Error reading stored default address:', error);
        }
        
        // PRIORITY 2: If no stored preference, use API default flags
        if (!defaultAddr) {
          console.log('🔍 Looking for API default address in:', mappedAddresses.map((addr: any) => ({
            id: addr.id,
            address: addr.address,
            isDefault: addr.isDefault,
            isDefaultShipping: addr.isDefaultShipping,
            _isDefaultType: typeof addr.isDefault,
            _isDefaultShippingType: typeof addr.isDefaultShipping
          })));
          
          defaultAddr = mappedAddresses.find((addr: any) => 
            addr.isDefault === true || 
            addr.isDefaultShipping === true ||
            String(addr.isDefault) === 'true' ||
            String(addr.isDefaultShipping) === 'true'
          );
        }
        
        // If still no default found, check for other possible indicators
        if (!defaultAddr) {
          console.log('🔍 No default found with standard fields, checking alternatives...');
          
          // Look for addresses with any truthy default value
          defaultAddr = mappedAddresses.find((addr: any) => 
            addr.isDefault || 
            addr.isDefaultShipping ||
            addr.default ||
            addr.defaultAddress ||
            addr.isDefaultAddress
          );
          
          console.log('🔍 Alternative search result:', defaultAddr ? `Found: ${defaultAddr.address}` : 'None found');
        }
        
        // WORKAROUND: If still no default found, use the most recently created/updated address
        // This handles API inconsistency where the default flag isn't properly updated
        if (!defaultAddr && mappedAddresses.length > 0) {
          console.log('🔧 WORKAROUND: No default flags found, using most recent address...');
          
          // Sort by createdDate (most recent first) to find the address that was just updated
          const sortedByDate = [...mappedAddresses].sort((a: any, b: any) => {
            const dateA = new Date(a.createdDate || a.updatedDate || 0);
            const dateB = new Date(b.createdDate || b.updatedDate || 0);
            return dateB.getTime() - dateA.getTime();
          });
          
          defaultAddr = sortedByDate[0];
          console.log('🔧 Selected most recent address:', {
            id: defaultAddr.addressId,
            address: defaultAddr.address,
            createdDate: defaultAddr.createdDate
          });
        }
        
        // If multiple addresses are marked as default, get the most recently updated one
        if (!defaultAddr && mappedAddresses.length > 0) {
          const defaultAddresses = mappedAddresses.filter((addr: any) => 
            addr.isDefault === true || 
            addr.isDefaultShipping === true ||
            String(addr.isDefault) === 'true' ||
            String(addr.isDefaultShipping) === 'true' ||
            addr.isDefault || 
            addr.isDefaultShipping ||
            addr.default ||
            addr.defaultAddress ||
            addr.isDefaultAddress
          );
          
          if (defaultAddresses.length > 1) {
            // Sort by updatedDate or createdDate (most recent first)
            defaultAddr = defaultAddresses.sort((a: any, b: any) => {
              const dateA = new Date(a.updatedDate || a.createdDate || 0);
              const dateB = new Date(b.updatedDate || b.createdDate || 0);
              return dateB.getTime() - dateA.getTime();
            })[0];
            console.log('🏠 Multiple default addresses found, using most recent:', defaultAddr?.address);
          } else if (defaultAddresses.length === 1) {
            defaultAddr = defaultAddresses[0];
            console.log('🏠 Found single default address:', defaultAddr?.address);
          }
        }
        
        if (defaultAddr) {
          console.log('🏠 ✅ Setting default address:', { 
            id: defaultAddr.id, 
            addressId: defaultAddr.addressId,
            address: defaultAddr.address, 
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.pincode,
            isDefault: defaultAddr.isDefault,
            isDefaultShipping: defaultAddr.isDefaultShipping,
            isDefaultBilling: defaultAddr.isDefaultBilling
          });
          console.log('🏠 ✅ FULL DEFAULT ADDRESS:', JSON.stringify(defaultAddr, null, 2));
          setDefaultAddress(defaultAddr);
        } else if (mappedAddresses.length > 0) {
          // If no default is set but we have addresses, use the first one
          console.log('🏠 ⚠️ No default address found, using first address:', {
            id: mappedAddresses[0].id,
            address: mappedAddresses[0].address,
            isDefault: mappedAddresses[0].isDefault
          });
          setDefaultAddress(mappedAddresses[0]);
        } else {
          console.log('🏠 ❌ No addresses found');
          setDefaultAddress(null);
        }
      } else {
        console.log('🏠 No address data in API response');
        setAddresses([]);
        setDefaultAddress(null);
      }
    } catch (err) {
      console.error('🏠 Error fetching addresses:', err);
      setAddresses([]);
      setDefaultAddress(null);
    } finally {
      setLoadingAddress(false);
      console.log('🔄 ==========================================');
      console.log('🔄 REFRESHING ADDRESSES - END');
      console.log('🔄 ==========================================');
    }
  }, []);

  // Fetch addresses when the component gains focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomeScreen gained focus - refreshing addresses');
      // Use setTimeout to ensure the screen is fully focused before refreshing
      const timer = setTimeout(() => {
        refreshAddresses();
      }, 100);
      
      return () => clearTimeout(timer);
    }, [])
  );
  
  // Fetch categories when the component mounts or gains focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
          const response = await apiService.categories.getAll();
          
          if (response.success && response.data) {
            // Filter categories for Agri Inputs using correct category ID
            const agriInputs = response.data.filter(category => 
              category.id === 2 // Correct ID for "agri input" category
            );
            
            // Filter categories for Groceries using correct category ID
            const groceries = response.data.filter(category => 
              category.id === 3 // Correct ID for "Groceries" category
            );
            
            setAgriInputCategories(agriInputs);
            setGroceriesCategories(groceries);
            
            console.log(`Fetched ${agriInputs.length} Agri Input categories and ${groceries.length} Groceries categories`);
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
        } finally {
          setLoadingCategories(false);
        }
      };
      
      fetchCategories();
    }, [])
  );

  // Show status bar when HomeScreen mounts
  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor('#ffffff');
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);
  
  // Define a type for banner images that can accept both local and remote images
  type BannerImage = {
    id: number | string;
    source: any; // Can be require() or { uri: string }
  };

  // You can dynamically load images from API or pass them as props
  const [originalImages, setOriginalImages] = useState<BannerImage[]>([
    { id: 1, source: require('../../assets/banner1.png') },
    { id: 2, source: require('../../assets/banner2.png') },
    { id: 3, source: require('../../assets/banner3.png') },
  ]);
  
  useEffect(() => {
    // This is just a sample - uncomment and modify when you have an actual API
    /*
    const fetchBannerImages = async () => {
      try {
        // Get the authentication token
        const token = await userService.getAuthToken();
        
        // Prepare headers
        const headers: HeadersInit = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)'
        };
        
        // Add authorization header if token exists
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/BannerImages`, {
          headers
        });
        const data = await response.json();
        
        // Transform API data to match our BannerImage type
        const apiImages: BannerImage[] = data.map((item: any, index: number) => ({
          id: item.id || index,
          source: { uri: item.imageUrl }  // Remote images use { uri: url } format
        }));
        
        setOriginalImages(apiImages);
      } catch (error) {
        console.error('Failed to fetch banner images:', error);
      }
    };
    
    // fetchBannerImages();
    */
  }, []);
  
  // Function to add a new image to the carousel
  const addImage = (newImage: BannerImage) => {
    setOriginalImages(prev => [...prev, newImage]);
  };

  // Recalculate swiperImages whenever originalImages changes
  const swiperImages = useMemo(() => {
    if (originalImages.length === 0) return [];
    return [
      { ...originalImages.slice(-1)[0], id: 'duplicate-start' },
      ...originalImages,
      { ...originalImages.slice(0, 1)[0], id: 'duplicate-end' },
    ];
  }, [originalImages]);

  useEffect(() => {
    if (scrollViewRef.current) {
      const initialPosition = screenWidth * 0.8;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: initialPosition, animated: false });
      }, 100);
    }
  }, [screenWidth]);

  useEffect(() => {
    // Show status bar with #09A84E color for HomeScreen
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#09A84E');
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);

  const handleOrderNow = () => {
    navigation.navigate('OrderNow', { userName, userPhone });
  };

  const handleAddressPress = () => {
    console.log('🏠 Navigating to MyAddress screen');
    navigation.navigate('MyAddress', { userName, userPhone });
  };

  const handleNotificationPress = () => {
    navigation.navigate('NotificationScreen', {});
  };

  const handleLanguageToggle = (lang: Language) => {
    setLanguage(lang);
  };

  const handleAgriInputsPress = () => {
    navigation.navigate('AgriInputScreen', { 
      userName, 
      userPhone,
      categories: agriInputCategories 
    });
  };

  const handleGroceriesPress = () => {
    navigation.navigate('GroceriesScreen', { 
      userName, 
      userPhone,
      categories: groceriesCategories 
    });
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const itemWidth = screenWidth * 0.8;
    const pageNum = Math.round(contentOffset.x / itemWidth);
    
    let actualIndex = pageNum - 1;
    if (actualIndex < 0) actualIndex = originalImages.length - 1;
    if (actualIndex >= originalImages.length) actualIndex = 0;
    
    setCurrentImageIndex(actualIndex);
  };

  const handleScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const itemWidth = screenWidth * 0.8;
    const pageNum = Math.round(contentOffset.x / itemWidth);
    
    if (pageNum === 0) {
      const targetPosition = originalImages.length * itemWidth;
      scrollViewRef.current?.scrollTo({ x: targetPosition, animated: false });
    } else if (pageNum === swiperImages.length - 1) {
      const targetPosition = itemWidth;
      scrollViewRef.current?.scrollTo({ x: targetPosition, animated: false });
    }
  };

  const [climateData, setClimateData] = useState({
    chanceOfRain: 20,
    weatherDescription: 'Partly Cloudy',
    temperature: 26,
    feelsLike: 20,
    weatherIcon: 'cloud',
  });

  useEffect(() => {
    // Fetch climate data from an API and update state
    // setClimateData(fetchedData);
  }, []);

  const handleClimatePress = () => {
    navigation.navigate('ClimateScreen');
  };
  
  const handleCallToShop = () => {
    setShowCallModal(true);
  };
  
  const handleCallNumber = () => {
    Linking.canOpenURL(`tel:${customerServiceNumber}`)
      .then(supported => {
        if (supported) {
          Linking.openURL(`tel:${customerServiceNumber}`);
        } else {
          Alert.alert(
            'Call Not Supported',
            'Your device does not support making phone calls. Please dial the number manually: ' + customerServiceNumber
          );
        }
      })
      .catch(err => {
        console.error('Error trying to call:', err);
        Alert.alert('Error', 'Could not initiate the call. Please try again later.');
      });
    
    setShowCallModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} hidden={false} />
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/splash1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity 
          style={styles.addressContainer} 
          onPress={handleAddressPress}
          onLongPress={() => {
            console.log('🔄 Manual refresh triggered');
            refreshAddresses();
          }}
        >
          {loadingAddress ? (
            <ActivityIndicator size="small" color="white" style={{ marginRight: 10 }} />
          ) : defaultAddress ? (
            <Text style={styles.addressText} numberOfLines={2}>
              {[
                defaultAddress?.address,
                defaultAddress?.city,
                defaultAddress?.state,
                defaultAddress?.pincode
              ].filter(Boolean).join(', ')}
            </Text>
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>
              {translate('Add delivery address')}
            </Text>
          )}
          <Icon name="chevron-right" size={12} color="white" />
        </TouchableOpacity>

        <View style={styles.languageToggle}>
          <TouchableOpacity 
            style={[
              styles.languageButton, 
              styles.languageButtonLeft,
              language === 'E' ? styles.languageButtonActive : styles.languageButtonInactive
            ]}
            onPress={() => handleLanguageToggle('E')}
          >
            <Text style={[
              styles.languageText,
              language === 'E' ? styles.languageTextActive : styles.languageTextInactive
            ]}>E</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.languageButton, 
              styles.languageButtonRight,
              language === 'K' ? styles.languageButtonActive : styles.languageButtonInactive
            ]}
            onPress={() => handleLanguageToggle('K')}
          >
            <Text style={[
              styles.languageText,
              language === 'K' ? styles.languageTextActive : styles.languageTextInactive
            ]}>K</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
          <Icon name="bell" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.climateBox} onPress={handleClimatePress}>
        <View style={styles.climateTextContainer}>
          <Text style={styles.chanceOfRain}>
            {translate('Chance of Rain:')} {climateData.chanceOfRain}%
          </Text>
          <Text style={styles.weatherDescription}>
            {climateData.weatherDescription}
          </Text>
          <View style={styles.temperatureContainer}>
            <Text style={styles.temperature}>
              {climateData.temperature}°C
            </Text>
          </View>
        </View>
        <View style={styles.weatherIconContainer}>
          <Icon name={climateData.weatherIcon} size={50} color="white" style={styles.weatherIcon} />
          <Text style={styles.feelsLike}>
            {translate('Feels like')} {climateData.feelsLike}°C {'>'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.swiperContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            style={styles.imageScrollView}
            snapToInterval={screenWidth * 0.8}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.scrollContentContainer}
          >
            {swiperImages.map((image, index) => (
              <View key={image.id} style={[styles.imageContainer, { width: screenWidth * 0.8 }]}>
                <Image
                  source={image.source}
                  style={styles.swiperImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.dotsContainer}>
            {originalImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentImageIndex === index ? styles.activeDot : styles.inactiveDot
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.twoBoxContainer}>
          <TouchableOpacity 
            style={[styles.actionBox, loadingCategories && styles.loadingBox]} 
            onPress={handleAgriInputsPress}
            disabled={loadingCategories}
          >
            <View style={styles.innerBox}>
              {loadingCategories ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#09A84E" />
                </View>
              ) : (
                <>
                  <Image 
                    source={
                      agriInputCategories.length > 0 && agriInputCategories[0].imageUrl
                        ? { uri: agriInputCategories[0].imageUrl }
                        : require('../../assets/banner1.png')
                    }
                    style={styles.boxImageFull}
                    resizeMode="cover"
                  />
                  {/* Category count badge removed */}
                </>
              )}
            </View>
            <Text style={[styles.boxText, styles.leftBoxText]}>
              {loadingCategories ? translate('Loading...') : translate('Agri Inputs >')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBox, loadingCategories && styles.loadingBox]} 
            onPress={handleGroceriesPress}
            disabled={loadingCategories}
          >
            <View style={styles.innerBox}>
              {loadingCategories ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#09A84E" />
                </View>
              ) : (
                <>
                  <Image 
                    source={
                      groceriesCategories.length > 0 && groceriesCategories[0].imageUrl
                        ? { uri: groceriesCategories[0].imageUrl }
                        : require('../../assets/banner2.png')
                    }
                    style={styles.boxImageFull}
                    resizeMode="cover"
                  />
                  {/* Category count badge removed */}
                </>
              )}
            </View>
            <Text style={[styles.boxText, styles.rightBoxText]}>
              {loadingCategories ? translate('Loading...') : translate('Groceries >')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.orderNowButton} onPress={handleOrderNow}>
          <Text style={styles.orderNowText}>{translate('Order Now')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpBox} onPress={handleCallToShop}>
          <Icon name="headphones" size={24} color="#F56606" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.callToShop}>{translate('Call to Shop')}</Text>
            <Text style={styles.helpText}>{translate('Get help from us whenever you want!')}</Text>
          </View>
          <Icon name="phone" size={24} color="#F56606" style={styles.icon} />
        </TouchableOpacity>
      </View>
      
      {/* Customer Service Call Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCallModal}
        onRequestClose={() => setShowCallModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCallModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.callIconContainer}>
              <Icon name="phone" size={50} color="#09A84E" />
            </View>
            
            <Text style={styles.modalTitle}>{translate('Customer Service')}</Text>
            <Text style={styles.phoneNumber}>{customerServiceNumber}</Text>
            <Text style={styles.modalDescription}>
              {translate('Our customer service team is available from 9:00 AM to 6:00 PM, Monday to Saturday.')}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
  },

  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', // Aligned to bottom
    justifyContent: 'flex-start',
    backgroundColor: '#09A84E', 
    paddingHorizontal: 15,
    paddingTop: 45, // Increased top padding even more
    paddingBottom: 10,
    height: 88,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  logoContainer: {
    marginRight: 10,
  },

  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
  },

  addressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },

  addressText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
    maxWidth: '90%',
    flexWrap: 'wrap',
    flex: 1,
    fontFamily: 'Montserrat',
  },

  languageToggle: {
    flexDirection: 'row',
    marginRight: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },

  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageButtonLeft: {
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },

  languageButtonRight: {
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
  },

  languageButtonActive: {
    backgroundColor: 'white',
  },

  languageButtonInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'white',
  },

  languageText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  languageTextActive: {
    color: '#09A84E',
  },

  languageTextInactive: {
    color: 'white',
  },

  notificationButton: {
    padding: 8,
  },
  
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
    marginTop: -5, // Small negative margin to reduce the gap slightly
    position: 'relative',
    paddingHorizontal: 10, // Match the side padding of the boxes
    zIndex: 0, // Ensure proper layering with climate box
  },
  
  welcome: { 
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  
  info: { 
    fontSize: 16,
    color: 'gray',
    marginBottom: 20
  },

  swiperContainer: {
    width: 408,
    height: 154,
    marginTop: 10, // Reduced top margin to minimize gap with climate box
    marginBottom: 0,
    alignItems: 'center',
  },

  imageScrollView: {
    width: '100%',
  },

  scrollContentContainer: {
    paddingLeft: Dimensions.get('window').width * 0.1,
    paddingRight: Dimensions.get('window').width * 0.1,
  },

  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  swiperImage: {
    width: '95%',
    height: 120,
    borderRadius: 0,
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 6.5,
    elevation: 10,
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

  activeDot: {
    backgroundColor: '#09A84E',
  },

  inactiveDot: {
    backgroundColor: '#ccc',
  },

  twoBoxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 408,
    height: 154,
    marginTop: 12,
    gap: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },

  actionBox: {
    width: 185,
    height: 154,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 24,
    marginHorizontal: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 9,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden', // Changed to hidden to ensure proper border radius
    position: 'relative',
  },

  innerBox: {
    width: 185,
    height: 110,
    backgroundColor: 'white',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    overflow: 'hidden', // Ensure the image respects the border radius
  },
  
  boxImage: {
    width: 50,
    height: 50,
  },
  
  boxImageFull: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 24,
  },

  boxText: {
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: '100%',
    height: 44,
    backgroundColor: '#FFFFFF',
    marginTop: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    zIndex: 1,
  },

  leftBoxText: {
    color: '#09A84E',
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 27, // 169% of 16px
    letterSpacing: 0,
  },

  rightBoxText: {
    color: '#187CCF',
    fontFamily: 'Montserrat',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 27, // 169% of 16px
    letterSpacing: 0,
  },

  orderNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09A84E',
    width: 388, // Increased width to match the Agri Input boxes with padding
    height: 49,
    marginTop: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#09A84E',
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 8,
    paddingLeft: 16,
    gap: 12,
    marginBottom: 20,
    marginHorizontal: 10, // Same side padding as the Agri Input boxes
  },

  orderNowText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 388, // Increased width to match the Agri Input boxes with padding
    height: 61,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    padding: 8,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F56606',
    gap: 12,
    justifyContent: 'space-between',
    marginHorizontal: 10, // Same side padding as the Agri Input boxes
  },

  icon: {
    marginHorizontal: 10,
    color: '#F56606',
  },

  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },

  callToShop: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F56606',
    fontFamily: 'Montserrat',
  },

  helpText: {
    fontSize: 14,
    color: '#F56606',
    fontFamily: 'Montserrat',
  },

  climateBox: {
    flexDirection: 'row',
    backgroundColor: '#09A84E',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginHorizontal: 0,
    marginTop: 88, // Added margin to account for absolute positioned header
    marginBottom: 8, // Reduced bottom margin for a smaller gap
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 140,
    zIndex: 1,
  },
  climateTextContainer: {
    flex: 1,
    paddingLeft: 15,
    paddingRight: 5,
    position: 'relative',
  },
  chanceOfRain: {
    fontSize: 16,
    color: 'white',
  },
  weatherDescription: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 5,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  temperature: {
    fontSize: 18,
    color: 'white',
    marginRight: 10,
    fontFamily: 'Montserrat',
  },
  feelsLike: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Montserrat',
  },
  weatherIconContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 15,
  },
  weatherIcon: {
    // Icon styling is handled by the Icon component
  },
  
  // Category box styles
  loadingBox: {
    opacity: 0.7,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  
  categoryCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#09A84E',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  categoryCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  callIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  phoneNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#09A84E',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  callButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  callButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
