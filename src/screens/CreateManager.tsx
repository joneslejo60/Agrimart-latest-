import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import apiService from '../services/apiService';
import LogoHeader from '../components/LogoHeader';
import { getUser } from '../services/userService';

const CreateManager = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'CreateManager'>>();

  const handleCreateManager = async () => {
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter all fields');
      return;
    }
    try {
      const response = await apiService.auth.createManager({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password: password.trim()
      });
      if (response.success) {
        const adminUser = await getUser();
        Alert.alert('Success', 'Manager created successfully!', [
          { text: 'Go to Admin Home', onPress: () => {
            if (adminUser) {
              navigation.replace('AdminTabs', {
                userName: adminUser.name || adminUser.phoneNumber || '',
                userPhone: adminUser.phoneNumber,
                profileImage: adminUser.profilePicture,
                designation: adminUser.role,
                screen: 'AdminHome',
                params: {}
              });
            }
          }}
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to create manager');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating manager');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <LogoHeader />
      <Text style={styles.title}>Create Manager</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter name"
        value={name}
        onChangeText={setName}
      />
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
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleCreateManager}>
        <Text style={styles.buttonText}>Create Manager</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={async () => {
        const adminUser = await getUser();
        if (adminUser) {
          navigation.replace('AdminTabs', {
            userName: adminUser.name || adminUser.phoneNumber || '',
            userPhone: adminUser.phoneNumber,
            profileImage: adminUser.profilePicture,
            designation: adminUser.role,
            screen: 'AdminHome',
            params: {}
          });
        }
      }}>
        <Text style={styles.secondaryButtonText}>Go to Admin Home</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreateManager;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 20, fontFamily: 'Montserrat' },
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
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
}); 