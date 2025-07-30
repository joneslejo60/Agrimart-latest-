import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { useLanguage } from '../context/LanguageContext';
import { getUser, fetchCurrentUserFromApi, saveUser, saveAuthToken } from '../services/userService';
import apiService from '../services/apiService';

// Function to generate a unique user ID
const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

type EnterNameNavProp = NativeStackNavigationProp<RootStackParamList, 'EnterName'>;
type EnterNameRouteProp = RouteProp<RootStackParamList, 'EnterName'>;

const EnterNameScreen = ({ route }: { route: EnterNameRouteProp }) => {
  const { translate } = useLanguage();
  const userType = route.params.userType || 'customer';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<EnterNameNavProp>();

  // Only allow alphabetic characters and spaces for name
  const handleNameChange = (text: string) => {
    const alphabeticValue = text.replace(/[^a-zA-Z\s]/g, '');
    setName(alphabeticValue);
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter your name, email, phone number, and password');
      return;
    }
    try {
      // Use correct endpoint based on userType
      let registerRes;
      if (userType === 'manager') {
        registerRes = await apiService.auth.createManager({
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          password: password.trim()
        });
      } else {
        registerRes = await apiService.auth.register({
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          password: password.trim()
        });
      }
      if (!registerRes.success || !registerRes.data) {
        Alert.alert('Registration failed', registerRes.error || 'Unknown error');
        return;
      }
      // Login after registration
      const loginRes = await apiService.auth.login(email.trim(), password);
      if (!loginRes.success || !loginRes.data || !loginRes.data.token) {
        Alert.alert('Login failed', loginRes.error || 'Unknown error');
        return;
      }
      await saveAuthToken(loginRes.data.token);
      
      // Fetch user info and navigate directly to home screen (bypassing OTP)
      const userInfo = await fetchCurrentUserFromApi();
      if (userInfo && userInfo.id) {
        await saveUser(userInfo);
        console.log('🔍 REGISTRATION DEBUG - User Info:', {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          role: userInfo.role,
          phoneNumber: userInfo.phoneNumber
        });
        
        // Navigate directly to appropriate home screen based on role
        if (userInfo.role?.toLowerCase() === 'manager' || userInfo.role?.toLowerCase() === 'admin') {
          console.log('✅ REGISTRATION DEBUG - Redirecting to AdminTabs');
          navigation.replace('AdminTabs', {
            userName: userInfo.name || userInfo.phoneNumber || '',
            userPhone: userInfo.phoneNumber,
            profileImage: userInfo.profilePicture,
            designation: userInfo.role,
            screen: 'AdminHome',
            params: {}
          });
        } else {
          console.log('✅ REGISTRATION DEBUG - Redirecting to HomeTabs (customer)');
          navigation.replace('HomeTabs', {
            userName: userInfo.name || userInfo.phoneNumber || '',
            userPhone: userInfo.phoneNumber,
            profileImage: userInfo.profilePicture,
            screen: 'Home',
            params: {}
          });
        }
      } else {
        Alert.alert('Error', 'Failed to fetch user info after registration.');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <Image source={require('../../assets/splash2.png')} style={styles.logo} />
      <Text style={styles.title}>{translate('Register')}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={handleNameChange}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Enter your phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        maxLength={15}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
      {/* Remove role selection modal */}
    </View>
  );
};

export default EnterNameScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  logo: { width: 150, height: 50, resizeMode: 'contain', alignSelf: 'flex-start' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 30 },
  subtitle: { fontSize: 14, color: 'gray', marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 15,
  },
  button: {
    backgroundColor: '#09A84E',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  roleButton: {
    backgroundColor: '#09A84E',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});