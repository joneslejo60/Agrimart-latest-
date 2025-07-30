import React from 'react';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './navigation.types';
import AdminBottomTabNavigator from './AdminBottomTabNavigator';

type AdminTabsRouteProp = RouteProp<RootStackParamList, 'AdminTabs'>;

interface AdminTabsProps {
  route: AdminTabsRouteProp;
}

const AdminTabs: React.FC<AdminTabsProps> = ({ route }) => {
  const { userName, userPhone, designation, screen, params } = route.params;
  
  return (
    <AdminBottomTabNavigator 
      userName={userName} 
      userPhone={userPhone} 
      designation={designation}
      initialScreen={screen} 
      initialParams={params} 
    />
  );
};

export default AdminTabs;