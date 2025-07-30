import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SwiperFlatList } from 'react-native-swiper-flatlist';

import { RootStackParamList } from '../navigation/navigation.types';
import { useLanguage } from '../context/LanguageContext';

type OnboardingNavProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'slide1',
    title: 'Hello, Smart Shopper!',
    subtitle: 'Groceries made easy. Shopping made joyful.',
    image: require('../../assets/onboarding1.png'),
  },
  {
    key: 'slide2',
    title: 'Welcome to Krishi Seva Kendra',
    subtitle: 'A trusted companion for farmers.',
    image: require('../../assets/onboarding2.png'),
  },
];

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavProp>();
  const { translate } = useLanguage();

  const handleLogin = () => {
    // Navigate to ChooseUser screen instead of Login
    navigation.navigate('ChooseUser');
  };

  const renderItem = ({ item }: { item: typeof slides[0] }) => (
    <View style={[styles.slide, { width }]}>
      <Image source={item.image} style={styles.centerImage} resizeMode="cover" />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/splash2.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <SwiperFlatList
          showPagination
          paginationActiveColor="#09A84E"
          paginationDefaultColor="#ccc"
          data={slides}
          renderItem={renderItem}
          keyExtractor={item => item.key}
          paginationStyle={{ position: 'absolute', bottom: 60, alignSelf: 'center' }}
          paginationStyleItem={{ width: 12, height: 12, marginHorizontal: 6, borderRadius: 6 }}
        />

        <View style={styles.bottomContainer}>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.skipText}>
              {translate('Skip & Login')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  logoContainer: { alignItems: 'flex-start', padding: 10, marginTop: 30 },
  logo: { width: 120, height: 40 },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerImage: {
    width: 300,
    height: 300,
    borderRadius: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'Montserrat',
  },
  bottomContainer: { 
    alignItems: 'center', 
    paddingVertical: 20,
    paddingBottom: 20,
  },
  skipText: { 
    fontSize: 16, 
    color: '#09A84E', 
    fontFamily: 'Montserrat',
    marginTop: 15,
  },
  adminText: {
    fontSize: 16,
    color: '#09A84E',
    fontFamily: 'Montserrat',
  },
  adminButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});

export default OnboardingScreen;
