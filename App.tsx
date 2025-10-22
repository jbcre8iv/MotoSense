import 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notificationService';

export default function App() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register for push notifications
    notificationService.registerForPushNotifications();

    // Listen for notifications when app is in foreground
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 [APP] Notification received:', notification);
      }
    );

    // Listen for notification interactions
    responseListener.current = notificationService.addNotificationResponseListener(
      (response) => {
        console.log('👆 [APP] Notification tapped:', response);
        // Handle navigation based on notification type
        const data = response.notification.request.content.data;
        // TODO: Navigate to appropriate screen based on data.type
      }
    );

    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
