import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import Geolocation from '@react-native-community/geolocation';
import { fetchWeatherData, WeatherData, getWeatherDescription, getWeatherIcon } from '../services/weatherService';
import { useLanguage } from '../context/LanguageContext';
import { requestLocationPermission } from '../services/settingsService';
import { Platform, PermissionsAndroid } from 'react-native';
// Removed LinearGradient import and type due to native module linking issues

// Define Geolocation types
type GeolocationPosition = {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
};

type ClimateScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ClimateScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<ClimateScreenNavigationProp>();
  
  // State for weather data
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>('Loading location...');
  
  // Coordinates for Bangalore, India
  const bangaloreLatitude = 12.9716;
  const bangaloreLongitude = 77.5946;
  
  // Use these as fallback or for emulator testing
  const fallbackLatitude = bangaloreLatitude;
  const fallbackLongitude = bangaloreLongitude;
  
  // Function to check if we're likely on an emulator
  const isLikelyEmulator = (coords: {latitude: number, longitude: number}): boolean => {
    // Common emulator locations (Silicon Valley area)
    const emulatorLocations = [
      {lat: 37.4, lng: -122.1}, // Mountain View
      {lat: 37.3, lng: -122.0}, // Cupertino
      {lat: 37.7, lng: -122.4}, // San Francisco
    ];
    
    // Check if coordinates are close to any known emulator default locations
    return emulatorLocations.some(loc => {
      const latDiff = Math.abs(coords.latitude - loc.lat);
      const lngDiff = Math.abs(coords.longitude - loc.lng);
      return latDiff < 0.5 && lngDiff < 0.5; // Within ~50km
    });
  };

  // Function to try getting location with different accuracy settings
  const tryGetLocation = (highAccuracy: boolean): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => resolve(position),
        error => reject(error),
        { 
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 30000, // Shorter timeout for high accuracy
          maximumAge: highAccuracy ? 10000 : 60000, // Shorter cache time for high accuracy
          distanceFilter: 10
        }
      );
    });
  };

  // Function to get current location and fetch weather data
const fetchWeather = async () => {
    try {
      console.log('fetchWeather started');
      setLoading(true);
      setError(null);

      // Add timeout fallback to prevent indefinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Location fetch timeout'));
        }, 20000); // 20 seconds timeout
      });

      // First, request location permission with timeout race
      const hasPermission = await Promise.race([
        requestLocationPermission(),
        timeoutPromise
      ]).catch(error => {
        console.error('Location permission request timed out or failed:', error);
        return false;
      });
      console.log('Location permission status:', hasPermission);

      if (!hasPermission) {
        console.log('Location permission denied or timed out, using fallback location');
        // Use fallback location (Bangalore) if permission is denied or timeout
        try {
          const data = await fetchWeatherData(bangaloreLatitude, bangaloreLongitude);

          if (data) {
            console.log('Fetched weather data:', data);
            setWeatherData(data);
            setLocationName('Bangalore, India (Default Location)');
            setError(null);
          } else {
            console.log('No weather data received for default location');
            setError('Failed to fetch weather data for default location');
          }
        } catch (fallbackErr) {
          console.error('Error fetching fallback weather data:', fallbackErr);
          setError('Failed to fetch weather data');
        } finally {
          setLoading(false);
          setRefreshing(false);
          console.log('Loading and refreshing set to false after fallback fetch');
        }
        return;
      }

      // If we have permission, try to get current location with timeout race
      try {
        // First try with high accuracy
        console.log('Trying to get location with high accuracy...');
        let position;

        const highAccuracyPromise = tryGetLocation(true);
        position = await Promise.race([highAccuracyPromise, timeoutPromise]).catch(async (highAccErr) => {
          console.log('High accuracy location failed or timed out, trying with low accuracy...', highAccErr);
          // If high accuracy fails, try with low accuracy
          const lowAccuracyPromise = tryGetLocation(false);
          return await Promise.race([lowAccuracyPromise, timeoutPromise]);
        });

        console.log('Successfully got location:', position);

        // If we get here, we have a position
        const pos = position as GeolocationPosition;
        const { latitude, longitude, accuracy } = pos.coords;
        console.log('Current location:', latitude, longitude, 'Accuracy:', accuracy, 'meters');

        // Check if we're likely on an emulator with default Silicon Valley location
        if (isLikelyEmulator({latitude, longitude})) {
          console.log('Detected emulator with default location. Using Bangalore coordinates instead.');

          // Use Bangalore coordinates for emulator testing
          const data = await fetchWeatherData(bangaloreLatitude, bangaloreLongitude);

          if (data) {
            console.log('Fetched weather data for emulator test location:', data);
            setWeatherData(data);
            setLocationName('Bangalore, India (Emulator Test Location)');
            setError(null);
          } else {
            console.log('No weather data received for emulator test location');
            setError('Failed to fetch weather data for Bangalore');
          }
        } else {
          // Use actual device location for real devices
          const data = await fetchWeatherData(latitude, longitude);

          if (data) {
            console.log('Fetched weather data for actual location:', data);
            setWeatherData(data);
            
            // Format location name based on available data from the weather API
            try {
              let formattedLocation = data.location.name;
              if (data.location.region) {
                formattedLocation += `, ${data.location.region}`;
              } else if (data.location.country) {
                formattedLocation += `, ${data.location.country}`;
              }
              
              // Set location name without coordinates
              setLocationName(formattedLocation);
              console.log('Weather API location data:', data.location, `Coordinates: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            } catch (locErr) {
              console.error('Error formatting location name:', locErr);
              setLocationName(`${data.location.name || 'Current Location'}`);
            }
          } else {
            console.log('No weather data received for actual location');
            setError('Failed to fetch weather data');
          }
        }
        
        // Always set loading to false after successful location fetch
        setLoading(false);
        setRefreshing(false);
        console.log('Loading and refreshing set to false after successful location fetch');
        
      } catch (err) {
        console.error('Error getting location:', err);

        // Determine the specific error message based on error code
        let errorMessage = 'Unable to get your location.';
        let errorTitle = 'Location Error';

        // Type assertion for Geolocation error
        const geoError = err as { code?: number };

        if (geoError.code === 1) { // PERMISSION_DENIED
          errorTitle = 'Location Permission Denied';
          errorMessage = 'Location permission was denied. Using default location instead.';
        } else if (geoError.code === 2) { // POSITION_UNAVAILABLE
          errorTitle = 'Location Unavailable';
          errorMessage = 'Your current location is unavailable. Make sure location services are enabled in your device settings.';
        } else if (geoError.code === 3) { // TIMEOUT
          errorTitle = 'Location Timeout';
          errorMessage = 'Getting your location timed out. This may happen indoors or in areas with poor GPS signal.';
        }

        // Show alert with specific error message
        Alert.alert(
          errorTitle,
          errorMessage + ' Using Bangalore, India as default location.',
          [
            {
              text: 'OK',
              onPress: async () => {
                console.log('Using Bangalore location due to error:', geoError.code);
                try {
                  // Use Bangalore coordinates
                  const data = await fetchWeatherData(bangaloreLatitude, bangaloreLongitude);

                  if (data) {
                    setWeatherData(data);
                    setLocationName('Bangalore, India (Default Location)');
                    setError(null);
                  } else {
                    setError('Failed to fetch weather data');
                  }
                } catch (fallbackErr) {
                  console.error('Error fetching Bangalore weather data:', fallbackErr);
                  setError('Failed to fetch weather data');
                } finally {
                  setLoading(false);
                  setRefreshing(false);
                  console.log('Loading and refreshing set to false after alert fallback fetch');
                }
              }
            }
          ]
        );
        
        // Set loading to false even if the alert is not acknowledged
        setLoading(false);
        setRefreshing(false);
        console.log('Loading and refreshing set to false after location error');
      }
    } catch (err) {
      console.error('Unexpected error in fetchWeather:', err);

      // Try to use fallback location
      try {
        console.log('Using fallback location due to unexpected error');
        const data = await fetchWeatherData(bangaloreLatitude, bangaloreLongitude);

        if (data) {
          setWeatherData(data);
          setLocationName('Bangalore, India (Fallback Location)');
          setError(null);
        } else {
          setError('Failed to fetch weather data');
        }
      } catch (fallbackErr) {
        console.error('Error fetching fallback weather data:', fallbackErr);
        setError('Failed to fetch weather data. Please check your internet connection and try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        console.log('Loading and refreshing set to false after unexpected error fallback fetch');
      }
    }
  };
  
  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchWeather();
  };
  
  // Fetch weather data on component mount
  useEffect(() => {
    fetchWeather();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // Format time for hourly display
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    
    console.log('Formatting time:', timeString, 'parsed as:', date.toLocaleTimeString());
    
    // Check if this is the current hour
    if (date.getHours() === now.getHours() && 
        date.getDate() === now.getDate() && 
        date.getMonth() === now.getMonth()) {
      return 'Now';
    }
    
    // Format hour with AM/PM
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    const formattedTime = `${hours}${ampm}`;
    console.log('Formatted time:', formattedTime);
    return formattedTime;
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4a89dc" barStyle="light-content" />
      
      <View style={styles.mainContent}>
        <View
          style={[
            styles.gradientBackground, 
            { 
              backgroundColor: '#4a89dc', // Light blue color
              opacity: 0.9 // Slightly transparent for a softer look
            }
          ]}
        />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{locationName}</Text>
        </View>
        {/* Map marker button removed since we're only using current location */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>{translate('Loading weather data...')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="exclamation-circle" size={50} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchWeather}>
              <Text style={styles.retryButtonText}>{translate('Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4a89dc']}
              />
            }
          >
            {weatherData && (
              <>
                <View style={styles.weatherInfoContainer}>
                  <Icon 
                    name={getWeatherIcon(weatherData.current.weatherCode)} 
                    size={90} 
                    color="white" 
                    style={styles.weatherIcon} 
                  />
{/* Temperature element removed completely */}
                  <Text style={styles.weatherDescription}>
                    {getWeatherDescription(weatherData.current.weatherCode)}
                  </Text>
                  <Text style={styles.feelsLike}>
                    {formatDate(weatherData.current.time)}
                  </Text>
                </View>
                
                <View style={styles.additionalInfoContainer}>
                  <Text style={styles.sectionTitle}>
                    {weatherData.current.precipitation > 0 
                      ? 'Rain expected today' 
                      : 'Weather conditions'}
                  </Text>
                  
                  {/* Removed Feels Like, Humidity, and Wind information */}
                  
                  <ScrollView 
                    horizontal={true} 
                    showsHorizontalScrollIndicator={false}
                    style={styles.hourlyScrollView}
                    contentContainerStyle={{ paddingRight: 20 }}
                    alwaysBounceHorizontal={true}
                  >
                    {weatherData.hourly.time.slice(0, 24).map((time, index) => (
                      <View key={index} style={styles.hourlyWeatherItem}>
                        <View style={{
                          backgroundColor: 'transparent',
                          marginBottom: 6,
                          width: '100%',
                        }}>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: '#666666', // Grey color
                            textAlign: 'center',
                          }}>{index === 0 ? 'Now' : formatTime(time)}</Text>
                        </View>
                        <Icon 
                          name={getWeatherIcon(weatherData.hourly.weatherCode[index])} 
                          size={28} 
                          color="#4a89dc" // Blue cloud
                          style={[styles.hourlyIcon, { borderColor: 'white', borderWidth: 1.5, borderRadius: 14, padding: 2 }]} 
                        />
                        <Text style={styles.hourlyTemp}>{Math.round(weatherData.hourly.temperature[index])}°C</Text>
                        <View style={styles.hourlyDetailRow}>
                          <Text style={styles.hourlyDetailValue}>
                            {weatherData.hourly.precipitation[index]}% 💧
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.forecastContainer}>
                  <Text style={styles.sectionTitle}>{translate('Forecast')}</Text>
                  <Text style={styles.forecastSubtitle}>{weatherData.daily.time.length}-day forecast</Text>
                  
                  {weatherData.daily.time.map((day, index) => {
                    const date = new Date(day);
                    const dayName = index === 0 
                      ? 'Today' 
                      : date.toLocaleDateString('en-US', { weekday: 'long' });
                    
                    return (
                      <View key={index} style={styles.forecastItem}>
                        <View style={styles.forecastIconContainer}>
                          <Icon 
                            name={getWeatherIcon(weatherData.daily.weatherCode[index])} 
                            size={24} 
                            color={
                              getWeatherIcon(weatherData.daily.weatherCode[index]) === 'sun-o' ? '#FFA500' : 
                              getWeatherIcon(weatherData.daily.weatherCode[index]) === 'cloud-rain' ? '#4682B4' : 
                              getWeatherIcon(weatherData.daily.weatherCode[index]) === 'question-circle' ? '#F08080' : 
                              '#708090'
                            } 
                          />
                        </View>
                        <View style={styles.forecastDayContainer}>
                          <Text style={styles.forecastDay}>{dayName}</Text>
                        </View>
                        <View style={styles.forecastTempContainer}>
                          <Text style={styles.forecastTemp}>
                            {Math.round(weatherData.daily.temperatureMax[index])}° / {Math.round(weatherData.daily.temperatureMin[index])}°
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
      
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
                params: { userName: '', userPhone: '' },
                state: {
                  routes: [{ name: 'Home', params: { userName: '', userPhone: '' } }],
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
                params: { userName: '', userPhone: '' },
                state: {
                  routes: [{ name: 'Cart', params: { userName: '', userPhone: '' } }],
                  index: 0,
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
                params: { userName: '', userPhone: '' },
                state: {
                  routes: [{ name: 'Profile', params: { userName: '', userPhone: '' } }],
                  index: 0,
                }
              }],
            });
          }}
        >
          <Ionicons name="person-outline" size={24} color="gray" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%', // 50% of the screen height
    zIndex: 0,
    // Add a shadow to create a fade effect at the bottom
    shadowColor: '#f8f8f8',
    shadowOffset: { width: 0, height: 150 },
    shadowOpacity: 1,
    shadowRadius: 75,
    elevation: 0, // No elevation to keep the shadow effect clean
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 5,
    elevation: 8,
    shadowColor: '#000',           // iOS shadow
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  
  tabButton: {
    alignItems: 'center',          // Center icon and text
    justifyContent: 'center',      // Center content vertically
    flex: 1,                       // Equal width distribution
  },
  
  tabLabel: {
    fontSize: 12,                  // Small text like original tabs
    color: 'gray',                 // Match inactive tint color
    marginTop: 2,                  // Small gap between icon and text
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', // Center vertically
    backgroundColor: 'transparent', // Keeping transparent background for climate screen
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
    marginRight: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
    zIndex: 1, // Ensure content is above the gradient
  },
  weatherInfoContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 180, // Significantly reduced to move content much higher
    marginBottom: 20, // Add some bottom margin to create space for date
    paddingTop: 0,
    height: 'auto', // Auto height to adjust with content
    gap: 0, // Minimize space between child elements
    position: 'relative', // Ensure proper positioning
    zIndex: 2, // Make sure it's above other elements
  },
  weatherIcon: {
    marginBottom: 10, // Small space below the icon
    marginTop: 0, // Reset top margin since we removed the temperature element
  },
  temperature: {
    fontSize: 55,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 0, // Reduced from 5 to bring elements closer
  },
  weatherDescription: {
    fontSize: 22,
    color: 'white',
    marginBottom: 2, // Reduced from 5 to bring elements closer
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  feelsLike: {
    fontSize: 16,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginBottom: 5, // Reduced from 15 to bring elements closer
    marginTop: 0, // Ensure no top margin
  },
  additionalInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginTop: 25, // Increased to create more space from the date
    marginBottom: 20,
    marginHorizontal: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 1,
    maxHeight: 180, // Limit the height of the box
    position: 'relative',
    top: -20, // Move it up to overlap with the blue background but not too much
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666', // Grey color
    marginBottom: 10,
  },
  hourlyScrollView: {
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 5,
    width: '100%', // Ensure it takes full width
    height: 120, // Fixed height to ensure proper scrolling
  },
  hourlyWeatherItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    backgroundColor: 'transparent', // Completely transparent background
    borderRadius: 10,
    padding: 8,
    width: 80, // Wider to accommodate text
    minHeight: 100, // Ensure consistent height
    // Removed all shadow properties
    borderWidth: 0.5, // Very subtle border
    borderColor: 'rgba(0, 0, 0, 0.1)', // Very light border
  },
  hourlyTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 6,
    textAlign: 'center',
    width: '100%', // Ensure the text takes full width
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // More visible background
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRadius: 4,
    overflow: 'visible', // Ensure text is not clipped
  },
  hourlyIcon: {
    marginBottom: 3,
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666', // Grey color
    marginBottom: 6,
    textAlign: 'center',
    width: '100%', // Ensure the text takes full width
  },
  hourlyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the content
    width: '100%',
    marginBottom: 3,
  },
  hourlyDetailLabel: {
    fontSize: 11,
    color: 'black',
    // Removed text shadow
  },
  hourlyDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666', // Grey color
    backgroundColor: 'transparent', // Transparent background
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#777',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  forecastContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  forecastSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: -8,
    marginBottom: 10,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // Increased from 8 to 14 for more spacing between days
    marginBottom: 2, // Added a small margin for additional separation
    borderBottomWidth: 0.5, // Adding a subtle separator line
    borderBottomColor: 'rgba(0,0,0,0.05)', // Very light separator
  },
  forecastIconContainer: {
    width: '10%',
    marginRight: 10,
  },
  forecastDayContainer: {
    width: '30%',
  },
  forecastDay: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  forecastTempContainer: {
    width: '60%',
    alignItems: 'flex-end',
  },
  forecastTemp: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  // New styles for loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: '50%', // Match the height of the blue background
    marginTop: 80, // Add some margin to position it below the header
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4a89dc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ClimateScreen;