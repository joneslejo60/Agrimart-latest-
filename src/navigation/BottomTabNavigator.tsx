

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeTabsParamList } from './navigation.types';
import { tabConfigs, tabBarOptions } from './tabConfig';
import { useLanguage } from '../context/LanguageContext';

const Tab = createBottomTabNavigator<HomeTabsParamList>();
const getTabScreenOptions = ({ route }: { route: any }) => {
  const tabConfig = tabConfigs.find(config => config.name === route.name);

  return {
    headerShown: false,
    
    tabBarIcon: ({ color, size }: { color: string; size: number }) => {
      const iconName = tabConfig?.iconName || 'home-outline';
      return <Ionicons name={iconName} size={size} color={color} />;
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
      screenOptions={getTabScreenOptions}
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
