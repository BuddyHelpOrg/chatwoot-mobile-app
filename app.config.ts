import { ExpoConfig, ConfigContext } from 'expo/config';
import packageJson from './package.json';

// Get the Chatwoot mobile app version from package.json
const version = packageJson.version;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BuddyHelp',
  slug: process.env.EXPO_PUBLIC_APP_SLUG || 'buddyhelp',
  version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
    enableFullScreenImage_legacy: true,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'org.buddyhelp.app',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription:
        'This app requires access to the camera to upload images and videos.',
      NSPhotoLibraryUsageDescription:
        'This app requires access to the photo library to upload images.',
      NSMicrophoneUsageDescription: 'This app requires access to the microphone to record audio.',
      NSAppleMusicUsageDescription:
        'This app does not use Apple Music, but a system API may require this permission.',
      UIBackgroundModes: ['fetch', 'remote-notification'],
      ITSAppUsesNonExemptEncryption: false, //todo: look if this is needed
    },
    googleServicesFile: process.env.EXPO_PUBLIC_IOS_GOOGLE_SERVICES_FILE,
    entitlements: {
      'aps-environment': 'production',
    },
    associatedDomains: ['applinks:app.chatwoot.com'],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.chatwoot.app',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_MEDIA_IMAGES',
    ],
    googleServicesFile: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_SERVICES_FILE,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'app.chatwoot.com',
            pathPrefix: '/app/accounts/',
            pathPattern: '/*/conversations/*',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'effc2cf0-e2a3-4e8f-8ff1-ed9ef0e876ca',
    },
    chatwootBaseUrl: process.env.EXPO_PUBLIC_CHATWOOT_BASE_URL,
    minimumChatwootVersion: process.env.EXPO_PUBLIC_MINIMUM_CHATWOOT_VERSION,
  },
  owner: 'buddyhelp',
  plugins: [
    'expo-font',
    [
      'react-native-permissions',
      {
        iosPermissions: ['Camera', 'PhotoLibrary', 'MediaLibrary'],
      },
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
    [
      'expo-build-properties',
      {
        // https://github.com/invertase/notifee/issues/808#issuecomment-2175934609
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 34,
          extraMavenRepos: ['$rootDir/../../../node_modules/@notifee/react-native/android/libs'],
          enableProguardInReleaseBuilds: true,
        },
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
    [
      '@config-plugins/ffmpeg-kit-react-native',
      {
        package: 'min',
        ios: {
          package: 'audio',
        },
      },
    ],
  ],
  androidNavigationBar: {
    backgroundColor: '#ffffff',
  },
});
