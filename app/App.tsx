import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { TranscriptDetail } from './src/screens/TranscriptDetail';
import { register, setApiKeyForRequests } from './src/services/api';
import { getApiKey, setApiKey } from './src/services/storage';
import { createNotificationChannel } from './src/services/foreground';
import { Colors } from './src/theme';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.text,
    background: Colors.bg,
    card: Colors.bg,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.recordActive,
  },
};

export default function App() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        // Create notification channel for Android
        await createNotificationChannel();

        // Load or create API key
        let key = await getApiKey();
        if (!key) {
          const response = await register();
          key = response.api_key;
          await setApiKey(key);
        }

        setApiKeyForRequests(key);
        setApiKeyState(key);
      } catch (err) {
        console.error('Initialization failed:', err);
        // Still try to load cached key
        const cached = await getApiKey();
        if (cached) {
          setApiKeyForRequests(cached);
          setApiKeyState(cached);
        }
      } finally {
        setInitializing(false);
      }
    }

    init();
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={DarkTheme}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Home">
              {() => <HomeScreen apiKey={apiKey || ''} />}
            </Stack.Screen>
            <Stack.Screen name="TranscriptDetail" component={TranscriptDetail} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
});
