import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import {
  fetchUnreadCount,
  incrementUnreadCount,
  setLastReceivedMessage,
  setContacts,
} from "@/redux/features/chat/slice";
import { ChatContact } from "@/redux/features/chat/types";
import { connectSocket, getSocket, disconnectSocket } from "@/services/socket.service";
import { apiFetch } from "@/services/apiClient";
import * as Notifications from "expo-notifications";
import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  RemoteMessage,
} from "@react-native-firebase/messaging";
import {
  registerForPushNotificationsAsync,
  unregisterPushToken,
  handleNotificationData,
} from "@/services/notification.service";

/**
 * GlobalMessageListener
 * Mounts at the root app level to maintain active real-time socket connection,
 * listen for incoming messages globally, update unread count badges,
 * and trigger native system push notifications when the app is in the foreground.
 */
export default function GlobalMessageListener() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const activeChatKey = useSelector((state: RootState) => state.chat?.activeChatKey);
  const contacts = useSelector((state: RootState) => state.chat?.contacts || []);

  const activeChatKeyRef = useRef<string | null>(null);
  activeChatKeyRef.current = activeChatKey;

  const contactsRef = useRef<ChatContact[]>(contacts);
  contactsRef.current = contacts;

  // Setup Firebase Cloud Messaging & local notification tap listeners
  useEffect(() => {
    let unsubscribeForeground = () => {};
    let unsubscribeNotificationOpened = () => {};
    let localTapSub: Notifications.EventSubscription | null = null;

    try {
      const messagingInstance = getMessaging();

      // 1. App in foreground: display native system push notification for non-chat alerts
      unsubscribeForeground = onMessage(messagingInstance, async (remoteMessage: RemoteMessage) => {
        console.log("[FCM Foreground Message Received]:", remoteMessage);
        // Chat messages are handled via socket 'receive_message' to avoid duplicate alerts
        if (remoteMessage.data?.type === "chat_message" || remoteMessage.data?.senderId) {
          return;
        }
        if (remoteMessage.notification) {
          const title = remoteMessage.notification.title || "Notification";
          const body = remoteMessage.notification.body || "";
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: (remoteMessage.data as Record<string, unknown>) || {},
              sound: "default",
            },
            trigger: null,
          }).catch(() => {});
        }
      });

      // 2. Notification opened when app was in BACKGROUND
      unsubscribeNotificationOpened = onNotificationOpenedApp(messagingInstance, (remoteMessage: RemoteMessage) => {
        console.log("[FCM Notification Opened from Background]:", remoteMessage);
        if (remoteMessage?.data) {
          handleNotificationData(remoteMessage.data);
        }
      });

      // 3. Notification opened from cold start / KILLED state
      getInitialNotification(messagingInstance)
        .then((remoteMessage: RemoteMessage | null) => {
          if (remoteMessage?.data) {
            console.log("[FCM Notification Opened from Cold Start]:", remoteMessage);
            handleNotificationData(remoteMessage.data);
          }
        })
        .catch(() => {});

      // 4. Local foreground notification tapped
      localTapSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data;
        if (data) {
          handleNotificationData(data);
        }
      });
    } catch (e) {
      console.warn("[FCM Listener Init Warning]:", e);
    }

    return () => {
      unsubscribeForeground();
      unsubscribeNotificationOpened();
      if (localTapSub) {
        localTapSub.remove();
      }
    };
  }, [dispatch]);

  useEffect(() => {
    let isMounted = true;
    let cleanupListeners: (() => void) | null = null;

    const initialize = async () => {
      let activeToken = token;
      if (!activeToken) {
        try {
          const saved = await AsyncStorage.getItem("userData");
          if (saved) {
            const parsed = JSON.parse(saved);
            activeToken = parsed?.token || parsed?.access_token || parsed?.data?.token || null;
          }
        } catch {
          // ignore
        }
      }

      if (!activeToken && !isAuthenticated) {
        unregisterPushToken().catch(() => {});
        disconnectSocket();
        return;
      }

      try {
        // Register FCM Push Token with backend
        registerForPushNotificationsAsync().catch(() => {});

        // Fetch contacts to cache avatars and names
        apiFetch("/messages/contacts").then((res) => {
          if (res.success && Array.isArray(res.data) && isMounted) {
            dispatch(setContacts(res.data));
          }
        });

        const socket = await connectSocket(activeToken || undefined);
        if (!socket || !isMounted) return;

        // Fetch initial unread count for tab badges
        dispatch(fetchUnreadCount());

        const handleReceiveMessage = (msg: any) => {
          if (!msg) return;

          // Dispatch to redux so any active chat screens can react
          dispatch(setLastReceivedMessage(msg));

          const currentOpenChat = activeChatKeyRef.current;
          const senderIdNum = Number(msg.sender);
          const senderRoleNormalized = String(msg.sender_role || "teacher").toLowerCase();
          const msgSenderKey = `${senderRoleNormalized}_${senderIdNum}`;

          // If the user is currently inside the active chat with this sender, do not alert or increment
          if (currentOpenChat && currentOpenChat.toLowerCase() === msgSenderKey) {
            return;
          }

          // Increment unread badge count
          dispatch(incrementUnreadCount());

          // Resolve sender details from cached contacts list
          const cachedContact = contactsRef.current.find(
            (c) =>
              Number(c.id) === senderIdNum &&
              (c.role || "teacher").toLowerCase() === senderRoleNormalized
          );

          const senderName =
            cachedContact?.name ||
            msg.sender_name ||
            (msg.sender_role
              ? msg.sender_role.charAt(0).toUpperCase() + msg.sender_role.slice(1)
              : "");

          const messagePreview =
            msg.message || (msg.file ? "📎 Sent an attachment" : "");

          // Trigger native system push notification in foreground
          if (senderName || messagePreview) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: senderName || "New Message",
                body: messagePreview,
                data: {
                  type: "chat_message",
                  senderId: String(senderIdNum),
                  senderRole: senderRoleNormalized,
                  senderName: senderName || "Chat",
                },
                sound: "default",
              },
              trigger: null,
            }).catch(() => {});
          }
        };

        const handleMessagesRead = () => {
          dispatch(fetchUnreadCount());
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("messages_read", handleMessagesRead);

        cleanupListeners = () => {
          socket.off("receive_message", handleReceiveMessage);
          socket.off("messages_read", handleMessagesRead);
        };
      } catch (err) {
        console.warn("[GlobalMessageListener Init Warning]:", err);
      }
    };

    initialize();

    // App state listener to re-verify socket connection when returning to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        const activeSocket = getSocket();
        if (!activeSocket || !activeSocket.connected) {
          connectSocket(token || undefined);
        }
        dispatch(fetchUnreadCount());
      }
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      isMounted = false;
      appStateSubscription.remove();
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [token, isAuthenticated, dispatch, router]);

  return null;
}
