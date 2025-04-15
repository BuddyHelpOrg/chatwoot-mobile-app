import * as Sentry from '@sentry/react-native';
import * as FileSystem from 'expo-file-system';

// TODO: Implement full audio conversion using a different approach
// The previous ffmpeg-kit-react-native package is deprecated and has been removed
// Currently returning original URLs, but will need a complete solution

export const convertOggToMp3 = async (oggUrl: string): Promise<string> => {
  try {
    // For now, just log that conversion is skipped and return the original URL
    console.log('Audio conversion skipped: ffmpeg functionality is not available');

    // We can still download the file to make it available locally
    const fileName = `audio_${Date.now()}.ogg`;
    const localUri = `${FileSystem.cacheDirectory}${fileName}`;

    // Download the file
    await FileSystem.downloadAsync(oggUrl, localUri);

    // Check if the download was successful
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      throw new Error('Downloaded file not found');
    }

    return localUri;
  } catch (error) {
    Sentry.captureException(error);
    return oggUrl; // Fallback to original URL
  }
};

export const convertAacToMp3 = async (inputPath: string): Promise<string> => {
  try {
    // For now, just log that conversion is skipped and return the original URL
    console.log('Audio conversion skipped: ffmpeg functionality is not available');

    // Just return the original path since we can't convert without ffmpeg
    return inputPath;
  } catch (error) {
    Sentry.captureException(error);
    return inputPath; // Fallback to original path
  }
};
