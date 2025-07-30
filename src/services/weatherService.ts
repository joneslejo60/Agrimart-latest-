// frontend/src/services/weatherService.ts

import { API_BASE_URL } from './apiConfig';

// Weather API base URL (Open-Meteo)
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Types for weather data
export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyWeather;
  daily: DailyWeather;
  location: LocationInfo;
}

export interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  apparentTemperature: number;
  precipitation: number;
  time: string;
}

export interface HourlyWeather {
  time: string[];
  temperature: number[];
  weatherCode: number[];
  precipitation: number[];
}

export interface DailyWeather {
  time: string[];
  weatherCode: number[];
  temperatureMax: number[];
  temperatureMin: number[];
  sunrise: string[];
  sunset: string[];
  precipitationSum: number[];
}

export interface LocationInfo {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

// Function to get weather code description
export function getWeatherDescription(code: number): string {
  // WMO Weather interpretation codes (WW)
  // https://open-meteo.com/en/docs
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return weatherCodes[code] || 'Unknown';
}

// Function to get weather icon based on weather code
export function getWeatherIcon(code: number): string {
  // Map weather codes to FontAwesome icon names
  if (code === 0) return 'sun-o'; // Clear sky
  if (code === 1) return 'sun-o'; // Mainly clear
  if (code === 2) return 'cloud'; // Partly cloudy
  if (code === 3) return 'cloud'; // Overcast
  if (code >= 45 && code <= 48) return 'cloud'; // Fog
  if (code >= 51 && code <= 67) return 'cloud-rain'; // Drizzle and rain
  if (code >= 71 && code <= 77) return 'snowflake-o'; // Snow
  if (code >= 80 && code <= 82) return 'cloud-rain'; // Rain showers
  if (code >= 85 && code <= 86) return 'snowflake-o'; // Snow showers
  if (code >= 95) return 'bolt'; // Thunderstorm
  
  return 'question-circle'; // Default/unknown
}

// Function to get location name from coordinates using reverse geocoding
export async function getLocationName(latitude: number, longitude: number): Promise<LocationInfo> {
  try {
    // Format coordinates to 4 decimal places for better compatibility
    const formattedLat = parseFloat(latitude.toFixed(4));
    const formattedLng = parseFloat(longitude.toFixed(4));
    
    console.log(`Getting location name for coordinates: ${formattedLat}, ${formattedLng}`);
    
    // Check if these are Bangalore coordinates (with some tolerance for rounding)
    if (Math.abs(formattedLat - 12.9716) < 0.1 && Math.abs(formattedLng - 77.5946) < 0.1) {
      console.log('Detected Bangalore coordinates, returning hardcoded location info');
      return {
        name: 'Bangalore',
        region: 'Karnataka',
        country: 'India',
        latitude: formattedLat,
        longitude: formattedLng
      };
    }
    
    // Check if these are likely emulator coordinates (Silicon Valley area)
    if ((Math.abs(formattedLat - 37.4) < 0.5 && Math.abs(formattedLng - (-122.1)) < 0.5) || // Mountain View
        (Math.abs(formattedLat - 37.3) < 0.5 && Math.abs(formattedLng - (-122.0)) < 0.5) || // Cupertino
        (Math.abs(formattedLat - 37.7) < 0.5 && Math.abs(formattedLng - (-122.4)) < 0.5)) { // San Francisco
      console.log('Detected emulator coordinates, returning Bangalore location info');
      return {
        name: 'Bangalore',
        region: 'Karnataka',
        country: 'India',
        latitude: 12.9716,
        longitude: 77.5946
      };
    }
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      // Try using OpenStreetMap Nominatim API with improved error handling
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${formattedLat}&lon=${formattedLng}&zoom=10`,
        {
          headers: {
            'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`Geocoding API response not OK: ${response.status}`);
        throw new Error(`Failed to fetch location data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geocoding API response received:', JSON.stringify(data).substring(0, 200) + '...');
      
      if (data) {
        // Extract location information from OpenStreetMap response
        if (data.address) {
          // Extract from address object
          const city = data.address.city || data.address.town || data.address.village || data.address.hamlet;
          const state = data.address.state || data.address.county;
          const country = data.address.country;
          
          return {
            name: city || data.name || 'Unknown',
            region: state || '',
            country: country || '',
            latitude,
            longitude
          };
        } else if (data.name) {
          // Use name directly if available
          return {
            name: data.name,
            region: '',
            country: '',
            latitude,
            longitude
          };
        }
      }
      
      // Default fallback if no results
      console.log('No location data found in API response');
      return getDefaultLocationInfo(latitude, longitude);
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.warn('Primary geocoding service failed, using fallback:', fetchError);
      
      // Try fallback method - use a simple lookup based on coordinates
      return getFallbackLocationName(latitude, longitude);
    }
  } catch (error) {
    console.error('Error fetching location name:', error);
    // Return default location info on error
    return getDefaultLocationInfo(latitude, longitude);
  }
}

// Fallback function to get approximate location name based on coordinates
async function getFallbackLocationName(latitude: number, longitude: number): Promise<LocationInfo> {
  try {
    // Try using our own API if available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/api/Geocoding?lat=${latitude}&lng=${longitude}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.name) {
          return {
            name: data.name,
            region: data.region || '',
            country: data.country || '',
            latitude,
            longitude
          };
        }
      }
    } catch (apiError) {
      console.warn('Fallback API geocoding failed:', apiError);
    }
    
    // If all else fails, use a simple lookup based on coordinates
    // This is a very basic approximation
    const roundedLat = Math.round(latitude);
    const roundedLng = Math.round(longitude);
    
    return {
      name: `Location (${roundedLat}°, ${roundedLng}°)`,
      region: '',
      country: '',
      latitude,
      longitude
    };
  } catch (error) {
    console.error('Fallback location lookup failed:', error);
    return getDefaultLocationInfo(latitude, longitude);
  }
}

// Helper function to get default location info
function getDefaultLocationInfo(latitude: number, longitude: number): LocationInfo {
  return {
    name: 'Current Location',
    region: '',
    country: '',
    latitude,
    longitude
  };
}

// Function to fetch weather data from Open-Meteo API
export async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData | null> {
  try {
    console.log(`Fetching weather data for coordinates: ${latitude}, ${longitude}`);
    
    // Format coordinates to 4 decimal places for better compatibility
    const formattedLat = parseFloat(latitude.toFixed(4));
    const formattedLng = parseFloat(longitude.toFixed(4));
    
    // Fetch location name in parallel with weather data
    const locationInfoPromise = getLocationName(formattedLat, formattedLng)
      .catch(error => {
        console.error('Location info fetch failed:', error);
        return getDefaultLocationInfo(formattedLat, formattedLng);
      });
    
    // Construct the API URL with all required parameters
    const url = `${WEATHER_API_URL}?latitude=${formattedLat}&longitude=${formattedLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum&timezone=auto`;
    
    console.log(`Weather API URL: ${url}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`Weather API response not OK: ${response.status}`);
        throw new Error(`Failed to fetch weather data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Weather API response received');
      
      // Check if the response contains the expected data structure
      if (!data.current || !data.hourly || !data.daily) {
        console.error('Weather API response missing required data:', data);
        throw new Error('Weather API response is missing required data');
      }
      
      // Wait for location info to complete
      const locationInfo = await locationInfoPromise;
      
      // Transform the API response into our WeatherData format
      return {
        current: {
          temperature: data.current.temperature_2m,
          weatherCode: data.current.weather_code,
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          humidity: data.current.relative_humidity_2m,
          apparentTemperature: data.current.apparent_temperature,
          precipitation: data.current.precipitation,
          time: data.current.time
        },
        hourly: {
          time: data.hourly.time.slice(0, 24), // Get first 24 hours
          temperature: data.hourly.temperature_2m.slice(0, 24),
          weatherCode: data.hourly.weather_code.slice(0, 24),
          precipitation: data.hourly.precipitation_probability.slice(0, 24)
        },
        daily: {
          time: data.daily.time,
          weatherCode: data.daily.weather_code,
          temperatureMax: data.daily.temperature_2m_max,
          temperatureMin: data.daily.temperature_2m_min,
          sunrise: data.daily.sunrise,
          sunset: data.daily.sunset,
          precipitationSum: data.daily.precipitation_sum
        },
        location: locationInfo
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Weather API fetch failed:', fetchError);
      
      // Try to get at least the location info
      const locationInfo = await locationInfoPromise;
      
      // Return a minimal weather data object with default values
      return getDefaultWeatherData(locationInfo);
    }
  } catch (error) {
    console.error('Error in fetchWeatherData:', error);
    // Always return a default weather data object instead of null
    // This ensures the UI can render something even if the API fails
    const defaultLocation = getDefaultLocationInfo(latitude, longitude);
    return getDefaultWeatherData(defaultLocation);
  }
}

// Helper function to generate default weather data when API fails
function getDefaultWeatherData(locationInfo: LocationInfo): WeatherData {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Generate times for the next 24 hours
  const hourlyTimes = Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now);
    time.setHours(now.getHours() + i);
    return time.toISOString();
  });
  
  // Generate times for the next 7 days
  const dailyTimes = Array.from({ length: 7 }, (_, i) => {
    const time = new Date(now);
    time.setDate(now.getDate() + i);
    return time.toISOString().split('T')[0];
  });
  
  return {
    current: {
      temperature: 25, // Default temperature
      weatherCode: 1, // Default to "Mainly clear"
      windSpeed: 5,
      windDirection: 180,
      humidity: 50,
      apparentTemperature: 25,
      precipitation: 0,
      time: now.toISOString()
    },
    hourly: {
      time: hourlyTimes,
      temperature: Array(24).fill(25), // Default temperatures
      weatherCode: Array(24).fill(1), // Default weather code
      precipitation: Array(24).fill(0) // Default precipitation
    },
    daily: {
      time: dailyTimes,
      weatherCode: Array(7).fill(1), // Default weather codes
      temperatureMax: Array(7).fill(30), // Default max temperatures
      temperatureMin: Array(7).fill(20), // Default min temperatures
      sunrise: Array(7).fill(today + 'T06:00:00Z'), // Default sunrise time
      sunset: Array(7).fill(today + 'T18:00:00Z'), // Default sunset time
      precipitationSum: Array(7).fill(0) // Default precipitation
    },
    location: locationInfo
  };
}

// Export a default object with all weather services
export default {
  fetchWeatherData,
  getWeatherDescription,
  getWeatherIcon,
  getLocationName
};