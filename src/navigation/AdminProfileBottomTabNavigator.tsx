import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AdminTabsParamList } from './navigation.types';
import { adminTabConfigs, tabBarOptions } from './adminTabConfig';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import { useLanguage } from '../context/LanguageContext';

const Tab = createBottomTabNavigator<AdminTabsParamList>();

const getTabScreenOptions = ({ route }: { route: any }) => {
  const tabConfig = adminTabConfigs.find(config => config.name === route.name);

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

interface AdminProfileBottomTabNavigatorProps {
  userName?: string;
  userPhone?: string;
  designation?: string;
  initialParams?: any;
}

const AdminProfileBottomTabNavigator: React.FC<AdminProfileBottomTabNavigatorProps> = ({
  userName,
  userPhone,
  designation,
  initialParams,
}) => {
  const { translate } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={getTabScreenOptions}
      initialRouteName="AdminProfile"
    >
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        initialParams={{ userName, userPhone, designation, ...initialParams }}
        options={{ tabBarLabel: translate('Profile') }}
      />
      {adminTabConfigs.map((tabConfig) => (
        <Tab.Screen
          key={tabConfig.name}
          name={tabConfig.name}
          component={tabConfig.component}
          initialParams={{ userName, userPhone, designation, ...initialParams }}
          options={{ tabBarLabel: translate(tabConfig.label) }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default AdminProfileBottomTabNavigator;
