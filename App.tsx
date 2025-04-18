import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import App from './src/app';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

// Handle background notifications
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  
  // For iOS, increment badge count for background notifications
  if (remoteMessage?.notification) {
    await notifee.incrementBadgeCount();
    
    // Display the notification using notifee
    // This is important for Android as Firebase might not display it automatically
    const { title, body } = remoteMessage.notification;
    
    // If you want to pass data from the notification to be used when it's pressed
    const data = remoteMessage.data || {};
    
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: 'default',
        importance: 4, // High importance for Android
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
  }
});

// TODO: It is a temporary fix to fix the reanimated logger issue
// Ref: https://github.com/gorhom/react-native-bottom-sheet/issues/1983
// https://github.com/dohooo/react-native-reanimated-carousel/issues/706
import './reanimatedConfig';
// import './wdyr';

const isStorybookEnabled = Constants.expoConfig?.extra?.eas?.storybookEnabled;

if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    attachScreenshot: true,
  });
}

if (__DEV__) {
  // eslint-disable-next-line
  require('./ReactotronConfig');
}
// Ref: https://dev.to/dannyhw/how-to-swap-between-react-native-storybook-and-your-app-p3o
export default (() => {
  if (isStorybookEnabled === 'true') {
    // eslint-disable-next-line
    return require('./.storybook').default;
  }

  if (!__DEV__) {
    return Sentry.wrap(App);
  }

  console.log('Loading Development App');
  return App;
})();
