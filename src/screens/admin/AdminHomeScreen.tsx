import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { fetchWeatherData, WeatherData, getWeatherDescription, getWeatherIcon } from '../../services/weatherService';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, AdminTabsParamList } from '../../navigation/navigation.types';
import { useLanguage, Language } from '../../context/LanguageContext';
import adminUtils from '../../services/adminUtils';

type AdminHomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabsParamList, 'AdminHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type AdminHomeScreenRouteProp = RouteProp<AdminTabsParamList, 'AdminHome'>;

const AdminHomeScreen = () => {
  const { language, setLanguage, translate } = useLanguage();
  const navigation = useNavigation<AdminHomeScreenNavigationProp>();
  const route = useRoute<AdminHomeScreenRouteProp>();
  const { userName = '', userPhone = '', designation = 'Manager', profileImage } = route.params || {};
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // State for order counts
  const [processingOrdersCount, setProcessingOrdersCount] = useState(0);
  const [allOrdersCount, setAllOrdersCount] = useState(0);
  
  // Weather data state
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#09A84E');

    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  }, []);

  // Fetch dashboard data and weather data on component mount
  useEffect(() => {
    fetchOrderCounts();
    fetchWeather();
    fetchDashboardData();
  }, []);

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      const data = await adminUtils.getDashboardData();
      setDashboardData(data);
      
      // Update order counts from dashboard data
      if (data.orderStats) {
        setProcessingOrdersCount(data.orderStats.processingOrders || 0);
        setAllOrdersCount(data.orderStats.totalOrders || 0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  type BannerImage = {
    id: number | string;
    source: any;
  };

  const [originalImages, setOriginalImages] = useState<BannerImage[]>([
    { id: 1, source: require('../../../assets/banner1.png') },
    { id: 2, source: require('../../../assets/banner2.png') },
    { id: 3, source: require('../../../assets/banner3.png') },
  ]);

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

  const handleProfilePress = () => {
    navigation.navigate('AdminProfile', {
      userName,
      userPhone,
      profileImage,
      designation
    });
  };

  const handleProcessingOrdersPress = () => {
    console.log('🎯 Navigating to AdminOrders with selectedTab: processing');
    navigation.navigate('AdminOrders', {
      userName,
      userPhone,
      profileImage,
      designation,
      selectedTab: 'processing'
    });
  };

  const handleNewOrdersPress = () => {
    console.log('🎯 Navigating to AdminOrders with selectedTab: all');
    navigation.navigate('AdminOrders', {
      userName,
      userPhone,
      profileImage,
      designation,
      selectedTab: 'all'
    });
  };

  const handleClimatePress = () => {
    navigation.navigate('ClimateScreen', undefined);
  };

  const handleLanguageToggle = (lang: Language) => {
    setLanguage(lang);
  };

  const handleNotificationPress = () => {
    navigation.navigate('NotificationScreen', {});
  };

  // Function to fetch order counts - replace with actual API call
  const fetchOrderCounts = async () => {
    try {
    
      setProcessingOrdersCount(5);
      setAllOrdersCount(8);
    } catch (error) {
      console.error('Error fetching order counts:', error);
      // Set default values on error
      setProcessingOrdersCount(0);
      setAllOrdersCount(0);
    }
  };

  // Function to fetch weather data
  const fetchWeather = async () => {
    try {
      setWeatherLoading(true);
      // Use Bangalore coordinates as default
      const bangaloreLatitude = 12.9716;
      const bangaloreLongitude = 77.5946;
      
      const data = await fetchWeatherData(bangaloreLatitude, bangaloreLongitude);
      if (data) {
        setWeatherData(data);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setWeatherLoading(false);
    }
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} hidden={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.profileContainer} onPress={handleProfilePress}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <Icon name="user-circle" size={40} color="white" />
            )}
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.designation} numberOfLines={1}>{designation}</Text>
          </View>
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
          <Icon name="bell" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weather Box */}
        <TouchableOpacity style={styles.climateBox} onPress={handleClimatePress}>
          <View style={styles.climateTextContainer}>
            <Text style={styles.chanceOfRain}>
              {translate('Chance of Rain:')} {weatherData ? Math.round(weatherData.current.precipitation * 100) : 0}%
            </Text>
            <Text style={styles.weatherDescription}>
              {weatherData ? getWeatherDescription(weatherData.current.weatherCode) : 'Loading...'}
            </Text>
            <View style={styles.temperatureContainer}>
              <Text style={styles.temperature}>
                {weatherData ? Math.round(weatherData.current.temperature) : '--'}°C
              </Text>
            </View>
          </View>
          <View style={styles.weatherIconContainer}>
            <Icon 
              name={weatherData ? getWeatherIcon(weatherData.current.weatherCode) : 'cloud'} 
              size={50} 
              color="white" 
              style={styles.weatherIcon} 
            />
            <Text style={styles.feelsLike}>
              {translate('Feels like')} {weatherData ? Math.round(weatherData.current.apparentTemperature) : '--'}°C {'>'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Banner Carousel */}
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

        {/* Order Management Cards */}
        <View style={styles.dashboardContainer}>
          <View style={styles.dashboardCardsTwo}>
            <TouchableOpacity style={styles.pendingOrderCard} onPress={handleProcessingOrdersPress}>
              <View style={styles.cardContent}>
                <View style={styles.cardTextContainer}>
                  <Icon name="calendar" size={28} color="white" style={styles.cardIcon} />
                  <Text style={styles.orderCount}>{processingOrdersCount}</Text>
                </View>
                <Text style={styles.cardTitle}>{translate('Processing Orders')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.newOrderCard} onPress={handleNewOrdersPress}>
              <View style={styles.cardContent}>
                <View style={styles.cardTextContainer}>
                  <Icon name="book" size={28} color="white" style={styles.cardIcon} />
                  <Text style={styles.orderCount}>{allOrdersCount}</Text>
                </View>
                <Text style={styles.cardTitle}>{translate('All Orders')}</Text>
              </View>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#09A84E',
    paddingVertical: 15,
    paddingHorizontal: 15
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileImage: {
    width: '100%',
    height: '100%'
  },
  userInfoContainer: {
    marginLeft: 10,
    flex: 1
  },
  userName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Montserrat'
  },
  designation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Montserrat'
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
    borderBottomLeftRadius: 15
  },
  languageButtonRight: {
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15
  },
  languageButtonActive: {
    backgroundColor: 'white'
  },
  languageButtonInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'white',
  },
  languageText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat'
  },
  languageTextActive: {
    color: '#09A84E'
  },
  languageTextInactive: {
    color: 'white'
  },
  notificationButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    marginTop: 0
  },
  scrollViewContent: {
    paddingBottom: 20,
    paddingTop: 0
  },
  swiperContainer: {
    width: 408,
    height: 154,
    marginTop: 8,
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
  dashboardContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignItems: 'center'
  },
  dashboardCardsTwo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 408,
    height: 120,
    marginTop: 8,
    gap: 8,
    marginBottom: 16,
  },
  pendingOrderCard: {
    flex: 1,
    height: 120,
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  newOrderCard: {
    flex: 1,
    height: 120,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  cardIcon: {
    marginBottom: 4,
  },
  climateBox: {
    flexDirection: 'row',
    backgroundColor: '#09A84E',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 8,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 140,
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
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  cardTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 18,
  },
  orderCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  }
});

export default AdminHomeScreen;