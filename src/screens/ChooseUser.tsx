import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LogoHeader from '../components/LogoHeader';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { useLanguage } from '../context/LanguageContext';

type ChooseUserNavProp = NativeStackNavigationProp<RootStackParamList, 'ChooseUser'>;

const ChooseUser = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSelect = (role: 'admin' | 'customer') => {
    navigation.navigate('Login', { role });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <LogoHeader />
      <Text style={styles.title}>User login </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('EnterName', { phoneNumber: '', userType: 'customer' })}>
          <Text style={styles.buttonText}>Register as Customer</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login', {})}>
        <Text style={styles.loginButtonText}>Login with Phone Number</Text>
      </TouchableOpacity>
      {/* <TouchableOpacity style={styles.adminLoginButton} onPress={() => navigation.navigate('AdminLogin')}>
        <Text style={styles.adminLoginButtonText}>Admin Login</Text>
      </TouchableOpacity> */}
      {/* Remove bottomButtons (Register and Skip/Login) */}
    </View>
  );
};

export default ChooseUser;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 40, fontFamily: 'Montserrat', textAlign: 'center' },
  buttonContainer: { marginTop: 20 },
  button: {
    backgroundColor: '#09A84E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    fontSize: 18,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  registerButton: {
    backgroundColor: '#09A84E',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  registerButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    fontSize: 16,
  },
  skipButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  skipButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#09A84E',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    fontSize: 16,
  },
  adminLoginButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  adminLoginButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
    fontSize: 16,
  },
}); 