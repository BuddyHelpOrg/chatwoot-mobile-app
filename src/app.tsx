import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Alert, BackHandler, View, Button, Text, Platform, StyleSheet } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { AppNavigator } from '@/navigation';
import {
  initializeNotifications,
  updateBadgeCount,
  diagnoseNotificationSetup,
  sendTestNotification,
} from '@/utils/pushUtils';

import i18n from '@/i18n';

// Simple debug component for notifications
const NotificationDebugger = () => {
  if (!__DEV__) return null; // Only show in development

  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugTitle}>Notification Testing (DEV)</Text>
      <View style={styles.buttonRow}>
        <Button
          title="Diagnose"
          onPress={async () => {
            const result = await diagnoseNotificationSetup();
            Alert.alert('Diagnosis Complete', 'Check the console logs for results');
          }}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="Test Notification"
          onPress={async () => {
            try {
              await sendTestNotification();
              Alert.alert('Notification Sent', 'Check if you received the test notification');
            } catch (error) {
              Alert.alert('Error', `Failed to send notification: ${error}`);
            }
          }}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Reset Badge"
          onPress={() => {
            updateBadgeCount({ count: 0 });
            Alert.alert('Badge Reset', 'iOS badge count has been reset to 0');
          }}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="Set Badge to 5"
          onPress={() => {
            updateBadgeCount({ count: 5 });
            Alert.alert('Badge Set', 'iOS badge count has been set to 5');
          }}
        />
      </View>

      <Text style={styles.noteText}>These tools are only visible in development mode</Text>
    </View>
  );
};

const Chatwoot = () => {
  useEffect(() => {
    // Set up back button handler
    BackHandler.addEventListener('hardwareBackPress', handleBackButtonClick);

    // Initialize notifications
    initializeNotifications().then(token => {
      if (token) {
        console.log('FCM Token:', token);
        // Here you would send this token to your backend
      }
    });

    // Reset iOS badge count when app opens
    updateBadgeCount({ count: 0 });

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButtonClick);
    };
  }, []);

  const handleBackButtonClick = () => {
    Alert.alert(
      i18n.t('EXIT.TITLE'),
      i18n.t('EXIT.SUBTITLE'),
      [
        {
          text: i18n.t('EXIT.CANCEL'),
          onPress: () => {},
          style: 'cancel',
        },
        { text: i18n.t('EXIT.OK'), onPress: () => BackHandler.exitApp() },
      ],
      { cancelable: false },
    );
    return true;
  };

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppNavigator />
        <NotificationDebugger />
      </PersistGate>
    </Provider>
  );
};

const styles = StyleSheet.create({
  debugContainer: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  buttonSpacer: {
    width: 10,
  },
  noteText: {
    color: '#cccccc',
    fontSize: 10,
    marginTop: 5,
  },
});

export default Chatwoot;
