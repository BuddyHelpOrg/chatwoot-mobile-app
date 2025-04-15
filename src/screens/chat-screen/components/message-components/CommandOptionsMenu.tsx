import React from 'react';
import { Alert, Linking, Platform, Pressable, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/hooks';
import { updateAttachments } from '@/store/conversation/sendMessageSlice';
import { useRefsContext } from '@/context';
import { AttachFileIcon, CameraIcon, MacrosIcon, PhotosIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import { useHaptic, useScaleAnimation } from '@/utils';
import { Icon } from '@/components-next/common';
import { MAXIMUM_FILE_UPLOAD_SIZE } from '@/constants';
import i18n from '@/i18n';
import { showToast } from '@/utils/toastUtils';
import { findFileSize } from '@/utils/fileUtils';
import { getApiLevel } from 'react-native-device-info';
import { Dispatch } from 'redux';

export const handleOpenPhotosLibrary = async (dispatch: Dispatch) => {
  if (Platform.OS === 'ios') {
    request(
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.PHOTO_LIBRARY
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
    ).then(async result => {
      if (RESULTS.BLOCKED === result) {
        Alert.alert(
          'Permission Denied',
          'The permission to access the photo library has been denied and cannot be requested again. Please enable it in your device settings if you wish to access photos from your library.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => {
                // Open app settings
                Linking.openSettings();
              },
            },
          ],
          { cancelable: false },
        );
      }
      if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
        const pickedAssets = await launchImageLibrary({
          quality: 1,
          selectionLimit: 4,
          mediaType: 'mixed',
          presentationStyle: 'formSheet',
        });
        if (pickedAssets.didCancel) {
        } else if (pickedAssets.errorCode) {
        } else {
          if (pickedAssets.assets && pickedAssets.assets?.length > 0) {
            validateFileAndSetAttachments(dispatch, pickedAssets.assets[0]);
          }
        }
      }
    });
  } else {
    const apiLevel = await getApiLevel();
    const permission =
      apiLevel >= 33
        ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

    request(permission).then(async result => {
      if (RESULTS.BLOCKED === result) {
        Alert.alert(
          'Permission Denied',
          'The permission to access the photo library has been denied and cannot be requested again. Please enable it in your device settings if you wish to access photos from your library.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => {
                // Open app settings
                Linking.openSettings();
              },
            },
          ],
          { cancelable: false },
        );
      }
      if (result === RESULTS.GRANTED) {
        const pickedAssets = await launchImageLibrary({
          quality: 1,
          selectionLimit: 4,
          mediaType: 'mixed',
          presentationStyle: 'formSheet',
        });
        if (pickedAssets.didCancel) {
        } else if (pickedAssets.errorCode) {
        } else {
          if (pickedAssets.assets && pickedAssets.assets?.length > 0) {
            validateFileAndSetAttachments(dispatch, pickedAssets.assets[0]);
          }
        }
      }
    });
  }
};

const handleLaunchCamera = async (dispatch: Dispatch) => {
  request(Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA).then(
    async result => {
      if (RESULTS.BLOCKED === result) {
        Alert.alert(
          'Permission Denied',
          'The permission to access the camera has been denied and cannot be requested again. Please enable it in your device settings if you wish to use the camera feature.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => {
                // Open app settings
                Linking.openSettings();
              },
            },
          ],
          { cancelable: false },
        );
      }
      if (RESULTS.GRANTED === result) {
        const imageResult = await launchCamera({
          presentationStyle: 'formSheet',
          mediaType: 'mixed',
        });
        if (imageResult.didCancel) {
        } else if (imageResult.errorCode) {
        } else {
          if (imageResult.assets && imageResult.assets?.length > 0) {
            validateFileAndSetAttachments(dispatch, imageResult.assets[0]);
          }
        }
      }
    },
  );
};

/**
 * Doing this so that the our Store Object Attachments is of single type - Asset from Image Picker Library
 * The function `mapObject` takes an object of type DocumentPicker document and returns an array of
 * `Asset` objects with properties `fileName`, `fileSize`, `type`, and `uri`.
 * @returns The function `mapObject` is returning an array of `Asset` objects.
 */
const mapObject = (originalObject: DocumentPicker.DocumentPickerResult): Asset[] => {
  if (!originalObject.assets || !originalObject.assets[0]) {
    return [];
  }

  const document = originalObject.assets[0];
  return [
    {
      fileName: document.name || '',
      fileSize: document.size || 0,
      type: document.mimeType || '',
      uri: document.uri || '',
    },
  ];
};

const handleAttachFile = async (dispatch: Dispatch) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/*',
        'text/plain',
        'audio/*',
        'application/zip',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '*/*',
      ],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      // User cancelled the picker
      return;
    }

    const file = mapObject(result)[0];
    validateFileAndSetAttachments(dispatch, file);
  } catch (err) {
    console.error('Error picking document:', err);
  }
};

const ADD_MENU_OPTIONS = [
  {
    icon: <PhotosIcon />,
    title: 'Photos',
    handlePress: handleOpenPhotosLibrary,
  },
  {
    icon: <CameraIcon />,
    title: 'Camera',
    handlePress: handleLaunchCamera,
  },
  {
    icon: <AttachFileIcon />,
    title: 'Attach File',
    handlePress: handleAttachFile,
  },
  {
    icon: <MacrosIcon />,
    title: 'Macros',
    handlePress: () => {},
  },
];

export const validateFileAndSetAttachments = async (dispatch: Dispatch, attachment: Asset) => {
  const { fileSize } = attachment;
  if (findFileSize(fileSize || 0) <= MAXIMUM_FILE_UPLOAD_SIZE) {
    dispatch(updateAttachments([attachment]));
  } else {
    showToast({ message: i18n.t('CONVERSATION.FILE_SIZE_LIMIT') });
  }
};

type MenuOptionProps = {
  index: number;
  menuOption: (typeof ADD_MENU_OPTIONS)[0];
};

const MenuOption = (props: MenuOptionProps) => {
  const { index, menuOption } = props;
  const dispatch = useAppDispatch();
  const { macrosListSheetRef } = useRefsContext();

  const { animatedStyle, handlers } = useScaleAnimation();
  const hapticSelection = useHaptic();

  const handlePress = () => {
    hapticSelection?.();
    menuOption?.handlePress(dispatch);
    if (menuOption.title === 'Macros') {
      macrosListSheetRef.current?.present();
    }
  };

  return (
    <Animated.View style={[tailwind.style('mb-3'), animatedStyle]}>
      <Pressable onPress={handlePress} {...handlers}>
        <Animated.View key={index} style={[tailwind.style('flex-row items-center justify-start')]}>
          <Animated.View style={tailwind.style('p-2')}>
            <Icon icon={menuOption.icon} size={24} />
          </Animated.View>
          <Text
            style={tailwind.style(
              'text-base font-inter-normal-20 leading-[18px] tracking-[0.24px] text-gray-950 pl-5',
            )}>
            {menuOption.title}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export const CommandOptionsMenu = () => {
  const { bottom } = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const containerHeight = isAndroid
    ? 210 + (bottom === 0 ? 16 : bottom)
    : 175 + (bottom === 0 ? 16 : bottom);
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(38).stiffness(240)}
      exiting={SlideOutDown.springify().damping(38).stiffness(240)}
      style={tailwind.style('mx-1 pt-2 items-start', `h-[${containerHeight}px]`)}>
      {ADD_MENU_OPTIONS.map((menuOption, index) => {
        return <MenuOption key={menuOption.title} {...{ menuOption, index }} />;
      })}
    </Animated.View>
  );
};
