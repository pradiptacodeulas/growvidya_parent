import { Stack, useRouter, useRootNavigationState, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import { Provider, useDispatch, useSelector } from "react-redux";
import { logout, setUser } from "@/redux/auth/authSlice";
import { clearDashboardData } from "@/redux/home/homeSlice";
import { setTheme } from "@/redux/features/ui/slice";
import store, { AppDispatch, RootState } from "@/redux/store";
import { getData, storeData } from "@/utils/asyncStorage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import Toast, { BaseToast, InfoToast, ToastConfig } from "react-native-toast-message";
import GlobalMessageListener from "@/components/GlobalMessageListener";
import { setAuthToken, setOnUnauthorized } from "@/services/apiClient";
import { disconnectSocket } from "@/services/socket.service";
import { getMessaging, setBackgroundMessageHandler, RemoteMessage } from "@react-native-firebase/messaging";
import { useAppTheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Top-level background message handler for when app is killed or in background
try {
  const messagingInstance = getMessaging();
  setBackgroundMessageHandler(messagingInstance, async (remoteMessage: RemoteMessage) => {
    console.log("[FCM Background Message Received]:", remoteMessage.messageId);
  });
} catch (e) {
  console.warn("[FCM Background Handler Init Warning]:", e);
}

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#10B981",
        borderRadius: 14,
        height: "auto",
        minHeight: 56,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
      }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}
      text2Style={{ fontSize: 12.5, color: "#4B5563" }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#EF4444",
        borderRadius: 14,
        height: "auto",
        minHeight: 56,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
      }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}
      text2Style={{ fontSize: 12.5, color: "#4B5563" }}
    />
  ),
  info: (props) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: "#3B82F6",
        borderRadius: 14,
        height: "auto",
        minHeight: 56,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
      }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}
      text2Style={{ fontSize: 12.5, color: "#4B5563" }}
    />
  ),
};

function MainLayout() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const segments = useSegments();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    setOnUnauthorized(() => {
      disconnectSocket();
      dispatch(logout());
      dispatch(clearDashboardData());
    });
    return () => setOnUnauthorized(null);
  }, [dispatch]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Saved Theme (default to light and persist)
        const savedTheme = await getData("@app_theme_mode");
        if (savedTheme && (savedTheme === "light" || savedTheme === "dark" || savedTheme === "automatic")) {
          dispatch(setTheme(savedTheme));
        } else {
          dispatch(setTheme("light"));
          await storeData("@app_theme_mode", "light");
        }

        // Initialize Auth
        const authResponse = await getData("userData");
        if (authResponse) {
          const token = authResponse.token || authResponse.access_token || authResponse.data?.token;
          if (token) {
            setAuthToken(token);
          }
        }

        dispatch(setUser(authResponse || null));
      } catch (e) {
        dispatch(setUser(null));
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    // Redirect logic: Run whenever auth state or initialization changes
    if (!isInitialized || !navigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inMainGroup =
      segments[0] === "(main)" ||
      segments[0] === "student" ||
      segments[0] === "chat";

    if (isAuthenticated) {
      if (!inMainGroup) {
        router.replace("/(main)/(tabs)");
      }
    } else {
      if (!inAuthGroup) {
        router.replace("/(auth)/signin");
      }
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [isInitialized, isAuthenticated, navigationState?.key, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="student" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}

function RootContent() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.headerBg} />
      <GlobalMessageListener />
      <MainLayout />
      <Toast config={toastConfig} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={styles.container}>
        <BottomSheetModalProvider>
          <MenuProvider>
            <RootContent />
          </MenuProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
