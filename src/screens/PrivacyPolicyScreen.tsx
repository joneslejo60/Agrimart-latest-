

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { useLanguage } from '../context/LanguageContext';

type PrivacyPolicyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PrivacyPolicy'>;
const PrivacyPolicyScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<PrivacyPolicyScreenNavigationProp>();

  return (
    <View style={styles.container}>
      {/* 📱 Status bar styling - consistent with our brand identity */}
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />

      {/* 🎯 Header Section - Clear navigation and context */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{translate('Privacy Policy')}</Text>
      </View>

      {/* 📖 Privacy Policy Content - Transparent, accessible information */}
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>{translate('ITC Company Privacy Policy')}</Text>
        <Text style={styles.policyText}>
          ITC Limited values your privacy and is committed to protecting your personal information. 
          This Privacy Policy explains how we collect, use, and safeguard your data. By using our services, 
          you agree to the practices outlined in this policy.
        </Text>

        <Text style={styles.policyText}>
          1. **Data Collection**: We collect necessary data, such as your name, email, and transaction history, 
          to enhance user experience.
        </Text>

        <Text style={styles.policyText}>
          2. **Use of Information**: Your data is used for service improvements, personalized experiences, 
          and compliance with legal regulations.
        </Text>

        <Text style={styles.policyText}>
          3. **Data Security**: We implement strict security measures to protect your personal information.
        </Text>

        <Text style={styles.policyText}>
          4. **Your Rights**: You can request data deletion, access information, or opt-out of certain services.
        </Text>

        <Text style={styles.policyText}>
          For a detailed policy, visit our official website.
        </Text>
      </ScrollView>

      {/* 🧭 Bottom Navigation Bar - Matching Original Design */}
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
    </View>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', // Changed from center to flex-end to move content down
    backgroundColor: '#09A84E', 
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
  backButton: { marginRight: 10 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  content: { 
    padding: 20,
    marginTop: 88, // Added to account for absolute positioned header
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  policyText: { fontSize: 14, color: 'gray', marginBottom: 15 },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 5,              // Match original bottom tab padding
    paddingTop: 5,                 // Match original bottom tab padding
    height: 60,                    // Match original bottom tab height
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',       // Ensure clean background
    elevation: 8,                  // Android shadow
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
  }
});
