import {
  getMessaging,
  getToken,
  deleteToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './apiClient';
import { router } from 'expo-router';

// Configure foreground notification presentation behavior for local alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Configure Android notification channels
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
      sound: 'default',
    });
  }
}

/**
 * Request notification permission, retrieve Firebase FCM token, and register it with the backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    await setupNotificationChannels();

    // 1. Request OS permission for notifications across iOS and Android 13+
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[FCM Notification]: Permission not granted by user');
      return null;
    }

    const messagingInstance = getMessaging();

    // 2. Register device with APNs on iOS
    if (Platform.OS === 'ios') {
      await registerDeviceForRemoteMessages(messagingInstance).catch(() => {});
    }

    // 3. Retrieve native Firebase Cloud Messaging token
    const token = await getToken(messagingInstance);
    console.log('[FCM Notification] Successfully retrieved Firebase token:', token);

    if (!token) return null;

    // 4. Send token to Growvidya server
    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
    const deviceName = `${Platform.OS.toUpperCase()} Mobile`;

    const regResult = await apiFetch('/notifications/device-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        device_type: deviceType,
        device_name: deviceName,
      }),
    });

    console.log('[FCM Notification] Backend registration response:', regResult);

    if (regResult?.success) {
      await AsyncStorage.setItem('@fcm_push_token', token);

      // Listen for token refresh events
      onTokenRefresh(messagingInstance, async (refreshedToken: string) => {
        console.log('[FCM Notification] Token refreshed:', refreshedToken);
        await apiFetch('/notifications/device-token', {
          method: 'POST',
          body: JSON.stringify({
            token: refreshedToken,
            device_type: deviceType,
            device_name: deviceName,
          }),
        }).catch(() => {});
        await AsyncStorage.setItem('@fcm_push_token', refreshedToken);
      });

      return token;
    } else {
      console.warn('[FCM Notification] Failed to register token with server:', regResult?.message || regResult?.error);
      return null;
    }
  } catch (err: any) {
    console.error('[FCM registerForPushNotifications Error]:', err?.message || err);
    return null;
  }
}

/**
 * Unregister device push token upon user logout
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem('@fcm_push_token');
    if (token) {
      await apiFetch('/notifications/device-token', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      }).catch(() => {});
      await AsyncStorage.removeItem('@fcm_push_token');
    }
    const messagingInstance = getMessaging();
    await deleteToken(messagingInstance).catch(() => {});
  } catch (err: any) {
    console.warn('[FCM unregisterPushToken Error]:', err?.message);
  }
}

/**
 * Handle notification data payload and deep link to the target screen
 */
export function handleNotificationData(data: any): void {
  if (!data) return;

  try {
    // If it's a chat message notification
    if (data.senderId || data.sender_id || data.contactId) {
      const contactId = String(data.senderId || data.sender_id || data.contactId);
      const contactRole = String(data.senderRole || data.sender_role || 'teacher');
      const contactName = String(data.senderName || data.sender_name || 'Chat');
      router.push({
        pathname: '/chat/[id]',
        params: { id: contactId, role: contactRole, name: contactName },
      });
      return;
    }

    // Notice
    if (data.category === 'notice' || data.noticeId) {
      router.push('/student/Activity?tab=NOTICES' as any);
      return;
    }

    // Attendance
    if (data.category === 'attendance') {
      router.push('/student/Attendance' as any);
      return;
    }

    // Fees
    if (data.category === 'fees' || data.category === 'fee_reminder') {
      router.push('/student/Fees' as any);
      return;
    }

    // Default deep link path
    if (data.url && typeof data.url === 'string') {
      router.push(data.url as any);
    }
  } catch (err: any) {
    console.warn('[handleNotificationData Error]:', err?.message);
  }
}
