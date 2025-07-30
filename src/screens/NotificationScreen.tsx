import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Image, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation.types';
import { notificationsApi, Notification } from '../services/apiService';
import { getCartItems } from '../utils/cartStorage';
import { useLanguage } from '../context/LanguageContext';
import userService from '../services/userService';

type NotificationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotificationScreen'>;
type NotificationScreenRouteProp = RouteProp<RootStackParamList, 'NotificationScreen'>;

interface NotificationWithDate extends Notification {
  date: Date;
  timeAgo: string;
}

const NotificationScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation<NotificationScreenNavigationProp>();
  const route = useRoute<NotificationScreenRouteProp>();
  const { notificationId } = route.params || {};

  const [notifications, setNotifications] = useState<NotificationWithDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Function to calculate time ago
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffMin > 0) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else {
      return 'Just now';
    }
  };

  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await userService.getUser();
      const currentUserId = user?.id;
      const response = await notificationsApi.getAll();
      if (response.success && response.data) {
        // Filter notifications by userId if currentUserId is available
        const filteredNotifications = currentUserId
          ? response.data.filter(notification => notification.userId === currentUserId)
          : response.data;
        // Transform the notifications to include date and timeAgo
        const transformedNotifications = filteredNotifications.map(notification => ({
          ...notification,
          date: new Date(notification.dateSent),
          timeAgo: getTimeAgo(notification.dateSent)
        }));
        // Sort by date (newest first)
        transformedNotifications.sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(transformedNotifications);
      } else {
        setError(response.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('An error occurred while fetching notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch a specific notification by ID
  const fetchNotificationById = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await notificationsApi.getById(id);
      
      if (response.success && response.data) {
        setSelectedNotification(response.data);
        
        // Also add this notification to the list if it's not already there
        const notificationData = response.data; // Store the data outside the callback
        
        setNotifications(prev => {
          // Check if this notification already exists in the list
          const exists = prev.some(n => n.notificationId === notificationData.notificationId);
          
          if (!exists) {
            // Create a properly typed notification with date
            const notificationWithDate: NotificationWithDate = {
              notificationId: notificationData.notificationId,
              userId: notificationData.userId,
              message: notificationData.message,
              isRead: notificationData.isRead,
              dateSent: notificationData.dateSent,
              date: new Date(notificationData.dateSent),
              timeAgo: getTimeAgo(notificationData.dateSent)
            };
            return [notificationWithDate, ...prev];
          }
          return prev;
        });
      } else {
        setError(response.error || `Failed to fetch notification with ID: ${id}`);
      }
    } catch (err) {
      console.error(`Error fetching notification with ID ${id}:`, err);
      setError(`An error occurred while fetching notification with ID: ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // Initial data loading
  useEffect(() => {
    if (notificationId) {
      // If a specific notification ID is provided, fetch that notification
      fetchNotificationById(Number(notificationId));
    } else {
      // Otherwise fetch all notifications
      fetchNotifications();
    }
  }, [notificationId]);

  // Function to format date for grouping
  const formatDateGroup = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const notificationDate = new Date(date);
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    notificationDate.setHours(0, 0, 0, 0);
    
    if (notificationDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (notificationDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return notificationDate.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups: { [key: string]: NotificationWithDate[] }, notification) => {
    const dateGroup = formatDateGroup(notification.date);
    if (!groups[dateGroup]) {
      groups[dateGroup] = [];
    }
    groups[dateGroup].push(notification);
    return groups;
  }, {});

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationWithDate) => {
    // If notification is not read, mark it as read
    if (!notification.isRead) {
      try {
        const response = await notificationsApi.update(notification.notificationId, { 
          ...notification,
          isRead: true 
        });
        
        if (response.success) {
          // Update the notification in the local state
          setNotifications(prev => 
            prev.map(n => n.notificationId === notification.notificationId ? { ...n, isRead: true } : n)
          );
        }
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
    
    // You can add navigation to specific screens based on notification type here
    // For example: navigation.navigate('OrderDetails', { orderId: notification.orderId });
  };

  return (
    <>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" translucent={false} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Icon name="arrow-left" size={20} color="white" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.headerTitle}>{translate('Notifications')}</Text>
        </View>

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#09A84E" />
            <Text style={styles.loadingText}>{translate('Loading notifications...')}</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#09A84E']}
              />
            }
          >
            {error ? (
              <View style={styles.errorContainer}>
                <Icon name="exclamation-circle" size={50} color="#ff6b6b" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={() => notificationId ? fetchNotificationById(Number(notificationId)) : fetchNotifications()}
                >
                  <Text style={styles.retryButtonText}>{translate('Retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="bell-slash" size={50} color="#ccc" />
                <Text style={styles.emptyText}>{translate('No notifications yet')}</Text>
                <Text style={styles.emptySubText}>('You'll see your notifications here when you receive them')</Text>
              </View>
            ) : (
              <>
                {/* Selected notification detail view */}
                {selectedNotification && (
                  <View style={styles.selectedNotificationContainer}>
                    <Text style={styles.selectedNotificationTitle}>
                      Notification Details
                    </Text>
                    <View style={styles.selectedNotificationContent}>
                      <Text style={styles.selectedNotificationMessage}>
                        {selectedNotification.message || 'No message content'}
                      </Text>
                      <Text style={styles.selectedNotificationTime}>
                        {new Date(selectedNotification.dateSent).toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.backToListButton}
                      onPress={() => setSelectedNotification(null)}
                    >
                      <Text style={styles.backToListButtonText}>{translate('Back to all notifications')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* All notifications list */}
                {!selectedNotification && Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
                  <View key={dateGroup} style={styles.dateGroup}>
                    {/* Date Header */}
                    <Text style={styles.dateHeader}>{dateGroup}</Text>
                    
                    {/* Notifications for this date */}
                    {groupNotifications.map((notification) => (
                      <TouchableOpacity 
                        key={notification.notificationId} 
                        style={styles.notificationItem}
                        onPress={() => handleNotificationClick(notification)}
                      >
                        <View style={styles.notificationContent}>
                          <View style={styles.notificationHeader}>
                            <Text style={[
                              styles.notificationTitle,
                              !notification.isRead && styles.unreadTitle
                            ]}>
                              {/* Use first part of message as title */}
                              {notification.message ? notification.message.split('.')[0] : 'Notification'}
                            </Text>
                            <Text style={styles.notificationTime}>{notification.timeAgo}</Text>
                          </View>
                          <Text style={[
                            styles.notificationMessage,
                            !notification.isRead && styles.unreadMessage
                          ]}>
                            {notification.message || 'No message content'}
                          </Text>
                        </View>
                        {!notification.isRead && <View style={styles.unreadDot} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}

        {/* Bottom Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity 
            style={styles.tabButton}
            activeOpacity={0.6}
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'HomeTabs', 
                  params: { userName: route.params?.userName, userPhone: route.params?.userPhone },
                  state: {
                    routes: [{ name: 'Home', params: { userName: route.params?.userName, userPhone: route.params?.userPhone } }],
                    index: 0,
                  }
                }],
              });
            }}
          >
            <Ionicons name="home-outline" size={24} color="gray" />
            <Text style={styles.tabLabel}>{translate('Home')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            activeOpacity={0.6}
            onPress={async () => {
              // Get the latest cart items from storage
              const storedCartItems = await getCartItems();
              
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'HomeTabs', 
                  params: { userName: route.params?.userName, userPhone: route.params?.userPhone },
                  state: {
                    routes: [{ name: 'Cart', params: { userName: route.params?.userName, userPhone: route.params?.userPhone, cartItems: storedCartItems } }],
                    index: 0,
                  }
                }],
              });
            }}
          >
            <Ionicons name="cart-outline" size={24} color="gray" />
            <Text style={styles.tabLabel}>{translate('Cart')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            activeOpacity={0.6}
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'HomeTabs', 
                  params: { userName: route.params?.userName, userPhone: route.params?.userPhone },
                  state: {
                    routes: [{ name: 'Profile', params: { userName: route.params?.userName, userPhone: route.params?.userPhone } }],
                    index: 0,
                  }
                }],
              });
            }}
          >
            <Ionicons name="person-outline" size={24} color="gray" />
            <Text style={styles.tabLabel}>{translate('Profile')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },

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

  backButton: {
    padding: 5,
    marginRight: 15,
  },

  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 5,
  },

  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 88, // Added to account for absolute positioned header
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },

  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: '#09A84E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },

  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  dateGroup: {
    marginBottom: 20,
  },

  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },

  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  notificationItem: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  notificationContent: {
    flex: 1,
  },

  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },

  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },

  unreadTitle: {
    fontWeight: 'bold',
    color: '#000',
  },

  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 10,
  },

  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },

  unreadMessage: {
    color: '#333',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#09A84E',
    marginLeft: 10,
  },

  // Selected notification styles
  selectedNotificationContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  selectedNotificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },

  selectedNotificationContent: {
    marginBottom: 20,
  },

  selectedNotificationMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 15,
  },

  selectedNotificationTime: {
    fontSize: 14,
    color: '#999',
    textAlign: 'right',
  },

  backToListButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },

  backToListButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});