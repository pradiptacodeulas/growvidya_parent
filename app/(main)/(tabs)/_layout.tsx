import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchUnreadCount } from "@/redux/features/chat/slice";

import { useAppTheme } from "@/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const unreadCount = useSelector((state: RootState) => state.chat?.unreadCount || 0);
  const token = useSelector((state: RootState) => state.auth?.token);

  useEffect(() => {
    if (token) {
      dispatch(fetchUnreadCount());
    }
  }, [token, dispatch]);

  return (
    <Tabs
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          e.preventDefault();
          if (!navigation.isFocused()) {
            navigation.navigate(route.name, route.params);
          }
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
            paddingTop: 4,
            height: 64,
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
          default: {
            height: 60 + insets.bottom,
            paddingBottom: 10,
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => {
            return (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={size}
                color={color}
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="child"
        options={{
          headerShown: false,
          title: "Students",
          tabBarIcon: ({ color, size, focused }) => {
            return (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={size}
                color={color}
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          headerShown: false,
          title: "Messages",
          tabBarIcon: ({ color, size, focused }) => {
            return (
              <Ionicons
                name={focused ? "chatbubbles" : "chatbubbles-outline"}
                size={size}
                color={color}
              />
            );
          },
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#EF4444",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: Platform.OS === "android" ? 17 : undefined,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => {
            return (
              <Ionicons
                name={focused ? "person-circle" : "person-circle-outline"}
                size={size}
                color={color}
              />
            );
          },
        }}
      />
    </Tabs>
  );
}
