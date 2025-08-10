

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeTabsParamList } from './navigation.types';
import { tabConfigs, tabBarOptions } from './tabConfig';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import TabBarIcon from '../components/TabBarIcon';

const Tab = createBottomTabNavigator<HomeTabsParamList>();

const TabScreenOptions = ({ route }: { route: any }) => {
  const { cartCount } = useCart();
  const tabConfig = tabConfigs.find(config => config.name === route.name);

  return {
    headerShown: false,
    
    tabBarIcon: ({ color, size }: { color: string; size: number }) => {
      const iconName = tabConfig?.iconName || 'home-outline';
      const isCartTab = route.name === 'Cart';
      
      return (
        <TabBarIcon
          iconName={iconName}
          color={color}
          size={size}
          badgeCount={cartCount}
          showBadge={isCartTab}
        />
      );
    },
    
    tabBarActiveTintColor: tabBarOptions.activeTintColor,
    tabBarInactiveTintColor: tabBarOptions.inactiveTintColor,
    tabBarStyle: tabBarOptions.style,
  };
};

interface BottomTabNavigatorProps {
  userName?: string;
  userPhone?: string;
  initialScreen?: string;
  initialParams?: any;
}


const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({ userName, userPhone, initialScreen, initialParams }) => {
  const { translate } = useLanguage();
  
  return (
    <Tab.Navigator 
      screenOptions={TabScreenOptions}
      initialRouteName={initialScreen as keyof HomeTabsParamList}
    >
      {tabConfigs.map((tabConfig) => {
        const isInitialScreen = tabConfig.name === initialScreen;
        const screenParams = isInitialScreen 
          ? { userName, userPhone, ...initialParams }
          : { userName, userPhone };
          
        return (
          <Tab.Screen
            key={tabConfig.name}
            name={tabConfig.name}
            component={tabConfig.component}
            initialParams={screenParams}
            options={{
              tabBarLabel: translate(tabConfig.label),
            }}
          />
        );
      })}
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
