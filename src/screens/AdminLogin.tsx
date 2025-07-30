import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { fetchCurrentUserFromApi, saveUser, saveAuthToken } from '../services/userService';
import apiService from '../services/apiService';
import LogoHeader from '../components/LogoHeader';
import { API_BASE_URL } from '../services/apiConfig';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isApiConnected, setIsApiConnected] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'AdminLogin'>>();

  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      console.log('Checking API connection...');
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (response.ok) {
        console.log('API connection successful');
        setIsApiConnected(true);
      } else {
        console.log('API connection failed with status:', response.status);
        setIsApiConnected(false);
      }
    } catch (error) {
      console.error('API connection error:', error);
      setIsApiConnected(false);
    }
  };

  const createTestAdminDirect = async () => {
    try {
      const testAdmin = {
        name: "Test Admin",
        email: "admin@test.com",
        phoneNumber: "1234567890",
        password: "Admin123!"
      };
      
      console.log('Attempting to create admin via direct API call...');
      
      // Try direct API call without authentication
      const response = await fetch(`${API_BASE_URL}/api/Authentication/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
        },
        body: JSON.stringify(testAdmin)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Admin created successfully:', data);
        Alert.alert('Success', 'Test admin created! Try logging in with email: admin@test.com, password: Admin123!');
      } else {
        const errorText = await response.text();
        console.error('Failed to create admin:', errorText);
        
        // Try alternative endpoint
        const altResponse = await fetch(`${API_BASE_URL}/api/Authentication/create-manager`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
          },
          body: JSON.stringify(testAdmin)
        });

        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log('Admin created via alternative endpoint:', altData);
          Alert.alert('Success', 'Test admin created! Try logging in with email: admin@test.com, password: Admin123!');
        } else {
          const altErrorText = await altResponse.text();
          console.error('Alternative endpoint also failed:', altErrorText);
          Alert.alert('Error', 'Both admin creation endpoints failed. The backend may need configuration.');
        }
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      Alert.alert('Error', 'Failed to create test admin');
    }
  };

  const createTestAdmin = async () => {
    try {
      const testAdmin = {
        name: "Test Admin",
        email: "admin@test.com",
        phoneNumber: "1234567890",
        password: "Admin123!"
      };
      
      const response = await apiService.auth.createManager(testAdmin);
      if (response.success) {
        Alert.alert('Success', 'Test admin created! Use email: admin@test.com, password: Admin123!');
      } else {
        Alert.alert('Error', response.error || 'Failed to create admin');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create test admin');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Invalid Input', 'Enter your email and password');
      return;
    }

    if (!isApiConnected) {
      Alert.alert('Connection Error', 'Cannot connect to the server. Please check if the backend is running.');
      return;
    }

    try {
      console.log('Attempting login with:', { email: email.trim(), password: password });
      
      // Try direct login first
      const loginResponse = await fetch(`${API_BASE_URL}/api/Authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
        },
        body: JSON.stringify({ email: email.trim(), password: password })
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        console.log('Direct login successful:', data);
        
        if (data.token) {
          await saveAuthToken(data.token);
          const userInfo = await fetchCurrentUserFromApi();
          if (userInfo && userInfo.id) {
            await saveUser(userInfo);
            console.log('User info received:', userInfo);
            const userRole = userInfo.role?.toLowerCase();
            if (userRole === 'manager' || userRole === 'admin') {
              navigation.replace('CreateManager');
            } else {
              Alert.alert('Access Denied', `You are not authorized as an admin. Your role is: ${userInfo.role}`);
            }
          } else {
            Alert.alert('Error', 'Failed to fetch user info after login.');
          }
        } else {
          Alert.alert('Error', 'No authentication token received.');
        }
      } else {
        const errorText = await loginResponse.text();
        console.error('Direct login failed:', errorText);
        
        // Fallback to apiService
        const response = await apiService.auth.login(email.trim(), password);
        console.log('ApiService login response:', response);
        
        if (!response.success || !response.data || !response.data.token) {
          console.error('Login failed:', response);
          Alert.alert('Login failed', response.error || 'Invalid credentials. Make sure you have created an admin account first.');
          return;
        }
        await saveAuthToken(response.data.token);
        const userInfo = await fetchCurrentUserFromApi();
        if (userInfo && userInfo.id) {
          await saveUser(userInfo);
          console.log('User info received:', userInfo);
          console.log('User role:', userInfo.role);
          const userRole = userInfo.role?.toLowerCase();
          if (userRole === 'manager' || userRole === 'admin') {
            navigation.replace('CreateManager');
          } else {
            Alert.alert('Access Denied', `You are not authorized as an admin. Your role is: ${userInfo.role}`);
          }
        } else {
          Alert.alert('Error', 'Failed to fetch user info after login.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <LogoHeader />
      <Text style={styles.title}>Admin Login</Text>
      
      {/* API Connection Status */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, { color: isApiConnected ? '#28a745' : '#dc3545' }]}>
          API Status: {isApiConnected ? 'Connected' : 'Disconnected'}
        </Text>
        <TouchableOpacity onPress={checkApiConnection} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Enter admin email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity 
        style={[styles.button, { opacity: isApiConnected ? 1 : 0.5 }]} 
        onPress={handleLogin}
        disabled={!isApiConnected}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, {backgroundColor: '#6c757d', marginTop: 10, opacity: isApiConnected ? 1 : 0.5}]} 
        onPress={createTestAdmin}
        disabled={!isApiConnected}
      >
        <Text style={styles.buttonText}>Create Test Admin (Method 1)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, {backgroundColor: '#17a2b8', marginTop: 10, opacity: isApiConnected ? 1 : 0.5}]} 
        onPress={createTestAdminDirect}
        disabled={!isApiConnected}
      >
        <Text style={styles.buttonText}>Create Test Admin (Method 2)</Text>
      </TouchableOpacity>

      {!isApiConnected && (
        <Text style={styles.warningText}>
          Please ensure your backend server is running and accessible at: {API_BASE_URL}
        </Text>
      )}
    </View>
  );
};

export default AdminLogin;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 20, fontFamily: 'Montserrat' },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  button: {
    backgroundColor: '#09A84E',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  warningText: {
    color: '#dc3545',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
    fontFamily: 'Montserrat',
    fontStyle: 'italic',
  },
}); 