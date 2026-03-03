import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'voiceapi_recording';

export async function createNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Recording',
    importance: Notifications.AndroidImportance.LOW,
    description: 'Shows when VoiceAPI is recording audio',
    sound: undefined,
    vibrationPattern: undefined,
    enableVibrate: false,
  });
}

let notificationId: string | null = null;

export async function startRecordingService(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'VoiceAPI Recording',
      body: '00:00',
      sticky: true,
      autoDismiss: false,
      sound: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
    },
    trigger: null,
  });
}

export async function updateNotification(timerText: string): Promise<void> {
  if (Platform.OS !== 'android' || !notificationId) return;

  await Notifications.dismissNotificationAsync(notificationId);
  notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'VoiceAPI Recording',
      body: timerText,
      sticky: true,
      autoDismiss: false,
      sound: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
    },
    trigger: null,
  });
}

export async function stopRecordingService(): Promise<void> {
  if (notificationId) {
    await Notifications.dismissNotificationAsync(notificationId);
    notificationId = null;
  }
}
