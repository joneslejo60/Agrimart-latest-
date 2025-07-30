

import React from 'react';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './navigation.types';
import BottomTabNavigator from './BottomTabNavigator';

type HomeTabsRouteProp = RouteProp<RootStackParamList, 'HomeTabs'>;

interface HomeTabsProps {
  route: HomeTabsRouteProp;
}

const HomeTabs: React.FC<HomeTabsProps> = ({ route }) => {
  const { userName, userPhone, screen, params } = route.params;
  
  return <BottomTabNavigator userName={userName} userPhone={userPhone} initialScreen={screen} initialParams={params} />;
};

export default HomeTabs;
