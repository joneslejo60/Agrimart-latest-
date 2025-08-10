import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LogoHeader from '../components/LogoHeader';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { generateOtp } from '../services/loginService';
import { useLanguage } from '../context/LanguageContext';
import apiService from '../services/apiService';
import { fetchCurrentUserFromApi, saveUser, saveAuthToken } from '../services/userService';


type LoginNavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

// Helper to register user if not found
const registerUser = async (phoneNumber: string) => {
  const payload = {
    name: 'New User',
    email: `${phoneNumber}@example.com`,
    phoneNumber: phoneNumber,
    password: 'TempPassword123!'
  };
  return await apiService.auth.register(payload);
};

const LoginScreen = () => {
  const { translate } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<LoginNavProp>();

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Invalid Input', 'Enter your email');
      return;
    }
    if (!password) {
      Alert.alert('Invalid Input', 'Enter your password');
      return;
    }
    try {
      const response = await apiService.auth.login(email.trim(), password);
      if (!response.success || !response.data || !response.data.token) {
        Alert.alert('Login failed', response.error || 'Invalid credentials');
        return;
      }
      await saveAuthToken(response.data.token);
      // Fetch user info and navigate based on role
      const userInfo = await fetchCurrentUserFromApi();
      if (userInfo && userInfo.id) {
        await saveUser(userInfo);
        console.log('🔍 LOGIN DEBUG - User Info:', {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          role: userInfo.role,
          phoneNumber: userInfo.phoneNumber
        });
        console.log('🔍 LOGIN DEBUG - Role check:', {
          currentRole: userInfo.role,
          roleLowerCase: userInfo.role?.toLowerCase(),
          isManager: userInfo.role?.toLowerCase() === 'manager',
          isAdmin: userInfo.role?.toLowerCase() === 'admin',
          willGoToAdminTabs: userInfo.role?.toLowerCase() === 'manager' || userInfo.role?.toLowerCase() === 'admin'
        });
        
        if (userInfo.role?.toLowerCase() === 'manager' || userInfo.role?.toLowerCase() === 'admin') {
          console.log('✅ LOGIN DEBUG - Redirecting to AdminTabs');
          navigation.replace('AdminTabs', {
            userName: userInfo.name || userInfo.phoneNumber || '',
            userPhone: userInfo.phoneNumber,
            profileImage: userInfo.profilePicture,
            designation: userInfo.role,
            screen: 'AdminHome',
            params: {}
          });
        } else {
          console.log('❌ LOGIN DEBUG - Redirecting to HomeTabs (customer)');
          navigation.replace('HomeTabs', {
            userName: userInfo.name || userInfo.phoneNumber || '',
            userPhone: userInfo.phoneNumber,
            profileImage: userInfo.profilePicture,
            screen: 'Home',
            params: {}
          });
        }
      } else {
        Alert.alert('Error', 'Failed to fetch user info after login.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login');
    }
  };

  const handleOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Invalid Input', 'Enter your email');
      return;
    }
    try {
      // For OTP, treat email as phone number for backward compatibility
      const response = await generateOtp(email.trim());
      navigation.navigate('Otp', { phoneNumber: email.trim() });
    } catch (error) {
      Alert.alert('Error', 'An error occurred while generating OTP');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <LogoHeader />
      <Text style={styles.title}>{translate('Login')}</Text>
      <Text style={styles.subtitle}>{translate('Please enter your email')}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter email"
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
        style={styles.button}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 20, fontFamily: 'Montserrat' },
  subtitle: { fontSize: 14, color: 'gray', marginVertical: 10, fontFamily: 'Montserrat' },
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
});
