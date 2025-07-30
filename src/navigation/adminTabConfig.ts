import { ComponentType } from 'react';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminInventoryScreen from '../screens/admin/AdminInventoryScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import { tabBarOptions } from './tabConfig';

export interface AdminTabConfig {
  name: keyof import('./navigation.types').AdminTabsParamList;  // Screen identifier
  component: ComponentType<any>;                               // The actual screen component
  iconName: string;                                           // Ionicon name for visual representation
  label: string;                                              // User-friendly display name
}

export const adminTabConfigs: AdminTabConfig[] = [
  {
    name: 'AdminHome',
    component: AdminHomeScreen,
    iconName: 'home-outline',      //Universal symbol for "home base"
    label: 'Home',
  },
  {
    name: 'AdminOrders',
    component: AdminOrdersScreen,
    iconName: 'list-outline',      //List for orders
    label: 'Orders',
  },
  {
    name: 'AdminInventory',
    component: AdminInventoryScreen,
    iconName: 'cube-outline',      // Cube for inventory
    label: 'Inventory',
  },
];

// Re-export tabBarOptions from tabConfig
export { tabBarOptions };