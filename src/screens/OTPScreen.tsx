import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { generateOtp, verifyOtp } from '../services/loginService';
import { getUser, fetchCurrentUserFromApi, saveUser, saveAuthToken } from '../services/userService';
import apiService from '../services/apiService';
import { useLanguage } from '../context/LanguageContext';

type OtpScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Otp'>;

const OtpScreen = ({ route }: any) => {
  const { translate } = useLanguage();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const { phoneNumber, role = 'customer' } = route.params;
  const navigation = useNavigation<OtpScreenNavProp>();

  // Start countdown timer when component mounts
  useEffect(() => {
    startCountdown();
  }, []);

  // Countdown timer for resend OTP
  const startCountdown = () => {
    setResendDisabled(true);
    setCountdown(30);
    
    const timer = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  };

  // Handles OTP input changes
  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus on next input
    if (text !== '' && index < 5) {
      otpRefs[index + 1]?.current?.focus();
    }

    // Auto-verify when all digits are entered
    if (text !== '' && index === 5) {
      const allFilled = newOtp.every(digit => digit !== '');
      if (allFilled && !isLoading) {
        // Set loading state for auto-verification
        setIsLoading(true);
        handleVerify(newOtp);
      }
    }
  };

  // Function to generate OTP
  const handleGenerateOtp = async () => {
    if (resendDisabled) return;
    
    setIsLoading(true);
    const result = await generateOtp(phoneNumber);
    setIsLoading(false);
    
    if (result.success) {
      Alert.alert('Success', 'OTP has been sent to your phone.');
      startCountdown();
    } else {
      Alert.alert('Error', result.error || 'Failed to generate OTP. Please try again.');
    }
  };

  // Helper to register user if not found
  const registerUser = async (phoneNumber: string) => {
    const payload = {
      name: 'New User',
      email: `${phoneNumber}@example.com`,
      phoneNumber: phoneNumber,
      password: 'TempPassword123!'
    };
    const res = await apiService.auth.register(payload);
    console.log('Registration payload:', payload);
    console.log('Registration response:', res);
    return res;
  };

  // Function to verify OTP
  const handleVerify = async (otpArray = otp) => {
    const enteredOtp = otpArray.join('');
    if (enteredOtp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
      return;
    }
    
    // Prevent duplicate verification calls
    if (isLoading) {
      console.log('OTP verification already in progress, skipping...');
      return;
    }
    
    setIsLoading(true);
    let result = await verifyOtp(phoneNumber, enteredOtp);
    // If OTP verification fails, just show an error (no registration prompt)
    if (!result.success) {
      Alert.alert('Verification Failed', result.error || 'Invalid identifier or OTP.');
      setIsLoading(false);
      return;
    }
    if (result.success && result.data && result.data.token) {
      // Save the token first
      await saveAuthToken(result.data.token);
      // After successful OTP verification, fetch user info from /me
      const userInfo = await fetchCurrentUserFromApi();
      if (userInfo && userInfo.id) {
        await saveUser(userInfo);
        setShowPopup(true);
        setTimeout(() => {
          setShowPopup(false);
          // Navigate to correct home screen based on role
          if (userInfo.role === 'manager' || userInfo.role === 'admin') {
            navigation.replace('AdminTabs', {
              userName: userInfo.name || userInfo.phoneNumber || '',
              userPhone: userInfo.phoneNumber,
              profileImage: userInfo.profilePicture,
              designation: userInfo.role,
              screen: 'AdminHome',
              params: {}
            });
          } else {
            navigation.replace('HomeTabs', {
              userName: userInfo.name || userInfo.phoneNumber || '',
              userPhone: userInfo.phoneNumber,
              profileImage: userInfo.profilePicture,
              screen: 'Home',
              params: {}
            });
          }
        }, 1500);
      } else {
        Alert.alert('Error', 'Failed to fetch user info after OTP verification.');
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  };

  // Array of input refs for auto-focus
  const otpRefs = Array(6)
    .fill(null)
    .map(() => useRef<TextInput>(null));

  const isGuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <Image source={require('../../assets/splash2.png')} style={styles.logo} />
      <Text style={styles.title}>{translate('Verify OTP')}</Text>
      <Text style={styles.subtitle}>
        OTP sent to +91-{phoneNumber.replace(/^(\d{6})/, '******')}
      </Text>

      {/* OTP Boxes */}
      <View style={styles.otpContainer}>
        {otp.map((value, index) => (
          <TextInput
            key={index}
            ref={otpRefs[index]}
            style={styles.otpBox}
            keyboardType="numeric"
            maxLength={1} 
            value={value}
            onChangeText={(text) => handleOtpChange(text, index)}
          />
        ))}
      </View>

      {/* Resend OTP */}
      <TouchableOpacity 
        style={[styles.resend, resendDisabled && styles.resendDisabled]} 
        onPress={handleGenerateOtp}
        disabled={resendDisabled}
      >
        <Text style={styles.resendText}>{translate('Not received OTP?')}</Text>
        {resendDisabled ? (
          <Text style={styles.resendBold}>{translate('Resend in')} {countdown}s</Text>
        ) : (
          <Text style={styles.resendBold}>{translate('Resend')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={() => handleVerify()}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>{translate('Verify')}</Text>
        )}
      </TouchableOpacity>

      <Modal visible={showPopup} transparent animationType="fade">
        <View style={styles.popupContainer}>
          <View style={styles.popupBox}>
            <Image source={require('../../assets/tick.png')} style={styles.tick} />
            <Text style={styles.popupText}>{translate('OTP Verified Successfully!')}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  logo: { 
    width: 150, 
    height: 50, 
    resizeMode: 'contain', 
    alignSelf: 'flex-start',
    marginLeft: 0, // Ensure no left margin
    marginTop: 40, // Add some top margin to match LogoHeader
  },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  subtitle: { fontSize: 14, color: 'gray', marginVertical: 10 },

  // OTP Boxes
  otpContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20 },
  otpBox: {
    width: 40,
    height: 50,
    borderWidth: 2,
    borderColor: '#000',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 5,
    borderRadius: 8,
  },

  // Resend OTP Centered
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  resendDisabled: { opacity: 0.6 },
  resendText: { fontSize: 16, color: 'black' },
  resendBold: { fontSize: 16, color: '#222', fontWeight: 'bold', marginLeft: 5 },

  button: {
    backgroundColor: '#09A84E',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: 'rgba(0,128,0,0.5)' },

  popupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  popupBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  popupText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  tick: {
    width: 60,
    height: 60,
  },
});
