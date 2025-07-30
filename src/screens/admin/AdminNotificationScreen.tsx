import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { notificationsApi, Notification } from '../../services/apiService';
import { useLanguage } from '../../context/LanguageContext';

const AdminNotificationScreen = () => {
  const { translate } = useLanguage();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newUserId, setNewUserId] = useState('');

  // Fetch all notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.getAll();
      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        setError(response.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError('An error occurred while fetching notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Create a new notification
  const handleCreateNotification = async () => {
    if (!newUserId || !newMessage) {
      Alert.alert('Error', 'User ID and message are required');
      return;
    }
    try {
      const response = await notificationsApi.create({
        userId: newUserId,
        message: newMessage,
        dateSent: new Date().toISOString(),
        isRead: false
      });
      if (response.success) {
        Alert.alert('Success', 'Notification created');
        setNewMessage('');
        setNewUserId('');
        fetchNotifications();
      } else {
        Alert.alert('Error', response.error || 'Failed to create notification');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create notification');
    }
  };

  // Mark as read
  const handleMarkAsRead = async (notification: Notification) => {
    try {
      const response = await notificationsApi.update(notification.notificationId, {
        notificationId: notification.notificationId,
        userId: notification.userId,
        message: notification.message,
        dateSent: notification.dateSent,
        isRead: true
      });
      if (response.success) {
        fetchNotifications();
      } else {
        Alert.alert('Error', response.error || 'Failed to mark as read');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to mark as read');
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: number) => {
    try {
      const response = await notificationsApi.delete(notificationId);
      if (response.success) {
        fetchNotifications();
      } else {
        Alert.alert('Error', response.error || 'Failed to delete notification');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09A84E" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Notifications</Text>
      </View>
      <ScrollView style={styles.content}>
        {/* Create Notification Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>User ID</Text>
          <TextInput
            style={styles.input}
            value={newUserId}
            onChangeText={setNewUserId}
            placeholder="Enter user ID (UUID)"
          />
          <Text style={styles.formLabel}>Message</Text>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Enter notification message"
          />
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNotification}>
            <Text style={styles.createButtonText}>Create Notification</Text>
          </TouchableOpacity>
        </View>
        {/* Notification List */}
        {loading ? (
          <ActivityIndicator size="large" color="#09A84E" style={{ marginTop: 30 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : notifications.length === 0 ? (
          <Text style={styles.emptyText}>No notifications found.</Text>
        ) : (
          notifications.map((notification) => (
            <View key={notification.notificationId} style={styles.notificationItem}>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationMeta}>To: {notification.userId}</Text>
              <Text style={styles.notificationMeta}>Date: {new Date(notification.dateSent).toLocaleString()}</Text>
              <View style={styles.actionsRow}>
                {!notification.isRead && (
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkAsRead(notification)}>
                    <Text style={styles.actionButtonText}>Mark as Read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(notification.notificationId)}>
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09A84E',
    paddingHorizontal: 15,
    paddingTop: 45,
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
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
  },
  content: {
    flex: 1,
    marginTop: 88,
    padding: 16,
  },
  formContainer: {
    marginBottom: 24,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#09A84E',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  notificationMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 6,
  },
  notificationMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#09A84E',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default AdminNotificationScreen; 