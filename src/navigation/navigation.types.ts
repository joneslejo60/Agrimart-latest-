
export type RootStackParamList = {
  Splash: undefined;                                    
  Onboarding: undefined;                               //  Feature introduction - standalone experience
  Login: { role?: 'admin' | 'customer' };              //  Phone number entry - fresh start, with optional role
  Otp: { phoneNumber: string; role?: 'admin' | 'customer' };                        // SMS verification - needs the phone number and role
  EnterName: { phoneNumber: string; userType?: 'customer' | 'manager' };                  //Personal greeting setup - carries phone number
  HomeTabs: { userName: string; userPhone: string; profileImage?: string; screen?: keyof HomeTabsParamList; params?: any };   //Main app hub - personalized with user data
  AdminTabs: { userName: string; userPhone: string; profileImage?: string; designation?: string; screen?: keyof AdminTabsParamList; params?: any }; // Admin app hub - personalized with admin data
  AdminOrderHandle: { userName?: string; userPhone?: string; designation?: string; profileImage?: string; orderId?: string; orderData?: any }; // Order details and handling for admin
  AdminProducts: { userName?: string; userPhone?: string; designation?: string; profileImage?: string; productId?: string; productData?: any }; // Edit existing product for admin
  AddInventory: { userName?: string; userPhone?: string; designation?: string; profileImage?: string }; // Add new product for admin
  PrivacyPolicy: undefined;                           //  Legal transparency - accessible anytime
  Settings: undefined;                                 // User preferences - standalone configuration
  EditProfile: { userName?: string; userPhone?: string; profileImage?: string }; // Profile editing - personalization
  MyAddress: { userName?: string; userPhone?: string; addressData?: any; source?: string; isNewAddress?: boolean; addressIndex?: number }; //  Address management - delivery locations with user data
  EditAddress: { userName?: string; userPhone?: string; addressData?: any; isNewAddress?: boolean; addressIndex?: number; source?: string }; //  Address editing - modify delivery location
  MyOrders: { userName?: string; userPhone?: string }; //Order management - purchase history and tracking
  OrderNow: { userName?: string; userPhone?: string }; // Order placement - shopping experience
  NotificationScreen: { notificationId?: string; userName?: string; userPhone?: string };     //Notifications - user alerts and updates
  AgriInputScreen: { userName?: string; userPhone?: string; categories?: any[] }; //  Agricultural inputs - farming supplies
  GroceriesScreen: { userName?: string; userPhone?: string; categories?: any[] }; //  Groceries - food and household items
  ClimateScreen: undefined;                                  // Weather and climate information
  AdminProfile: { userName?: string; userPhone?: string; profileImage?: string; designation?: string }; //  Admin profile management
  EditAdminProfile: { userName?: string; userPhone?: string; profileImage?: string; designation?: string }; //  Admin profile editing
  ChooseUser: undefined;
  AdminLogin: undefined;
  CreateManager: undefined;
}

export type HomeTabsParamList = {
  Home: { userName?: string; userPhone?: string };      // Main dashboard - user's starting point
  Cart: { userName?: string; userPhone?: string; selectedAddress?: any; cartItems?: any[] };      //  Shopping experience - manage purchases
  Profile: { userName?: string; userPhone?: string; profileImage?: string };   // Personal space - account management with user data
}

export type AdminTabsParamList = {
  AdminHome: { userName?: string; userPhone?: string; designation?: string; profileImage?: string };      // Admin dashboard
  AdminOrders: { userName?: string; userPhone?: string; designation?: string; profileImage?: string; selectedTab?: 'all' | 'processing' | 'new' };    //  Order management for admin
  AdminInventory: { userName?: string; userPhone?: string; designation?: string; profileImage?: string }; // inventory management for admin
  AdminProfile: { userName?: string; userPhone?: string; designation?: string; profileImage?: string };   //  Admin profile screen
}
