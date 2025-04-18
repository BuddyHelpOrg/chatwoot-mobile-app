import { Platform } from 'react-native';
import { NOTIFICATION_TYPES } from '@/constants';
import notifee, { EventType, Event, AuthorizationStatus } from '@notifee/react-native';
import { Notification } from '@/types/Notification';
import messaging from '@react-native-firebase/messaging';

// ==========================================
// DIAGNOSTIC UTILITIES FOR NOTIFICATIONS
// ==========================================

/**
 * Diagnostic function to check notification setup
 * Call this from a button or useEffect to debug
 */
export const diagnoseNotificationSetup = async () => {
  // 1. Check Firebase Messaging permissions
  const firebasePermission = await messaging().hasPermission();
  console.log('== NOTIFICATION DIAGNOSIS ==');
  console.log('Firebase permission status:', 
    firebasePermission === messaging.AuthorizationStatus.AUTHORIZED ? 'AUTHORIZED' :
    firebasePermission === messaging.AuthorizationStatus.PROVISIONAL ? 'PROVISIONAL' :
    firebasePermission === messaging.AuthorizationStatus.NOT_DETERMINED ? 'NOT_DETERMINED' :
    firebasePermission === messaging.AuthorizationStatus.DENIED ? 'DENIED' : 'UNKNOWN'
  );
  
  // 2. Check Notifee permission status
  const notifeeSettings = await notifee.getNotificationSettings();
  console.log('Notifee authorization status:', 
    notifeeSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED ? 'AUTHORIZED' :
    notifeeSettings.authorizationStatus === AuthorizationStatus.PROVISIONAL ? 'PROVISIONAL' :
    notifeeSettings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED ? 'NOT_DETERMINED' :
    notifeeSettings.authorizationStatus === AuthorizationStatus.DENIED ? 'DENIED' : 'UNKNOWN'
  );
  
  // 3. Try to get FCM token
  try {
    const token = await messaging().getToken();
    const tokenPreview = token ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : 'null';
    console.log('FCM Token (partial):', tokenPreview);
  } catch (error) {
    console.log('Failed to get FCM token:', error);
  }
  
  // 4. Check iOS-specific settings
  if (Platform.OS === 'ios') {
    console.log('iOS badge count:', await notifee.getBadgeCount());
    
    // 5. Check if app has registered for remote notifications
    try {
      const isRegistered = await messaging().isDeviceRegisteredForRemoteMessages;
      console.log('Device registered for remote messages:', isRegistered);
    } catch (error) {
      console.log('Error checking remote message registration:', error);
    }
  }
  
  // 6. Check notification channels on Android
  if (Platform.OS === 'android') {
    const defaultChannel = await notifee.isChannelCreated('default');
    console.log('Default notification channel exists:', defaultChannel);
    
    const missedAlarmChannel = await notifee.isChannelCreated('missedAlarm');
    console.log('Missed alarm channel exists:', missedAlarmChannel);
  }
  
  return 'Diagnosis complete - check console logs';
};

/**
 * Test function to send a local notification
 * Useful for testing if notifications work at all
 */
export const sendTestNotification = async () => {
  try {
    await notifee.requestPermission();
    
    // Create channel first if on Android
    if (Platform.OS === 'android') {
      await createNotificationChannels();
    }
    
    // Display a test notification
    const notificationId = await notifee.displayNotification({
      title: 'Test Notification',
      body: 'This is a test notification from BuddyHelp at ' + new Date().toTimeString(),
      android: {
        channelId: 'default',
        importance: 4,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        foregroundPresentationOptions: {
          badge: true,
          sound: true,
          banner: true,
          list: true,
        },
      },
    });
    
    console.log('Test notification sent with ID:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    throw error;
  }
};

// Initialize notifications at app startup
export const initializeNotifications = async () => {
  console.log(`[NOTIF] Initializing notifications on ${Platform.OS}`);
  
  // Set up foreground notifications handler
  await setupForegroundNotifications();
  
  // Create default notification channel for Android
  await createNotificationChannels();

  // Request permissions for Firebase messaging (for both iOS and Android)
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
  console.log(`[NOTIF] Firebase permission granted:`, enabled);

  if (enabled) {
    // Register device for remote notifications (important for iOS)
    if (Platform.OS === 'ios') {
      try {
        if (!await messaging().isDeviceRegisteredForRemoteMessages) {
          console.log('[NOTIF] Registering for remote messages...');
          await messaging().registerDeviceForRemoteMessages();
          console.log('[NOTIF] Successfully registered for remote messages');
        } else {
          console.log('[NOTIF] Device already registered for remote messages');
        }
      } catch (error) {
        console.error('[NOTIF] Error registering for remote messages:', error);
      }
    }

    // Set up a token refresh listener
    messaging().onTokenRefresh(token => {
      console.log('FCM Token refreshed:', token);
      // Here you would send this token to your backend
    });

    try {
      // Return the FCM token
      const token = await messaging().getToken();
      console.log(`[NOTIF] FCM token obtained: ${token.substring(0, 10)}...`);
      return token;
    } catch (error) {
      console.error('[NOTIF] Error getting FCM token:', error);
      return null;
    }
  }

  return null;
};

export const setupForegroundNotifications = async () => {
  // Only needed for iOS since Android handles differently
  if (Platform.OS === 'ios') {
    // Request permissions
    const settings = await notifee.requestPermission({
      sound: true,
      alert: true,
      badge: true,
    });

    if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
      console.log('Permission settings:', settings);
    } else {
      console.log('User declined permissions');
    }

    // Set up foreground event handler
    return notifee.onForegroundEvent(({ type, detail }: Event) => {
      switch (type) {
        case EventType.DELIVERED:
          // Handle notification in foreground
          console.log('Notification received in foreground!', detail.notification);
          break;
        case EventType.PRESS:
          // Handle notification press
          console.log('User pressed notification', detail.notification);
          break;
      }
    });
  }
  return null;
};

export const clearAllDeliveredNotifications = () => {
  if (Platform.OS === 'android') {
  } else {
    notifee.cancelAllNotifications();
  }
};

export const updateBadgeCount = ({ count = 0 }) => {
  if (Platform.OS === 'ios' && count >= 0) {
    notifee.setBadgeCount(count);
  }
};

export const findConversationLinkFromPush = ({
  notification,
  installationUrl,
}: {
  notification: Notification;
  installationUrl: string;
}) => {
  const { notificationType } = notification;

  if (NOTIFICATION_TYPES.includes(notificationType)) {
    const { primaryActor, primaryActorId, primaryActorType } = notification;
    let conversationId = null;
    if (primaryActorType === 'Conversation') {
      conversationId = primaryActor.id;
    } else if (primaryActorType === 'Message') {
      conversationId = primaryActor.conversationId;
    }
    if (conversationId) {
      const conversationLink = `${installationUrl}/app/accounts/1/conversations/${conversationId}/${primaryActorId}/${primaryActorType}`;
      return conversationLink;
    }
  }
  return;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const findNotificationFromFCM = ({ message }: { message: any }) => {
  let notification = null;
  // FCM HTTP v1
  if (message?.data?.payload) {
    const parsedPayload = JSON.parse(message.data.payload);
    notification = parsedPayload.data.notification;
  }
  // FCM legacy. It will be deprecated soon
  else {
    notification = JSON.parse(message.data.notification);
  }
  return notification;
};

// Create notification channels for Android
export const createNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    // Check if 'default' channel already exists
    const channelExists = await notifee.isChannelCreated('default');
    if (!channelExists) {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        sound: 'default',
        importance: 4, // HIGH
        vibration: true,
        lights: true,
      });
    }

    // You can create additional channels as needed
    // Check if 'missedAlarm' channel already exists
    const missedAlarmExists = await notifee.isChannelCreated('missedAlarm');
    if (!missedAlarmExists) {
      await notifee.createChannel({
        id: 'missedAlarm',
        name: 'Missed Alarms',
        sound: 'default',
        importance: 4, // HIGH
        vibration: true,
      });
    }
  }
};
