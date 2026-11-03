import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Platform, Text } from 'react-native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Menu as MenuIcon, MoreVertical, User, LogOut } from 'lucide-react-native';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';
import { logout } from '@/redux/auth/authSlice';
import { clearDashboardData } from '@/redux/home/homeSlice';
import { removeData } from '@/utils/asyncStorage';
import { apiFetch, setAuthToken } from '@/services/apiClient';
import { disconnectSocket } from '@/services/socket.service';
import { unregisterPushToken } from '@/services/notification.service';

import { useAppTheme } from '@/theme';

export default function CustomHeader() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  const displayName =
    user?.name ||
    user?.full_name ||
    (user?.first_name || user?.firstName
      ? `${user.first_name || user.firstName} ${user.last_name || user.lastName || ''}`.trim()
      : '');

  const handleLogout = async () => {
    await unregisterPushToken();
    await apiFetch('/parent/auth/logout', { method: 'POST' }).catch(() => {});
    disconnectSocket();
    setAuthToken(null);
    await removeData('userData');
    await removeData('parent_profile');
    dispatch(logout());
    dispatch(clearDashboardData());
  };

  return (
    <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 10), backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
      <View style={styles.headerContainer}>
        {/* Left: Open Drawer */}
        <TouchableOpacity 
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuButton}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <MenuIcon size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Center: Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={isDark ? require("@/assets/images/logo_dark.png") : require("@/assets/images/logo.png")}
            style={styles.logo}
          />
        </View>

        {/* Right: Actions Menu */}
        <View style={styles.rightActions}>
          <Menu>
            <MenuTrigger>
              <View style={[styles.actionButton, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <MoreVertical size={22} color={colors.textSecondary} />
              </View>
            </MenuTrigger>
            <MenuOptions optionsContainerStyle={[styles.profileMenuContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {!!displayName && (
                <>
                  <View style={styles.profileMenuHeader}>
                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {displayName}
                    </Text>
                    {!!user?.relation && (
                      <Text style={[styles.profileRole, { color: colors.textMuted }]}>{user.relation}</Text>
                    )}
                  </View>
                  <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                </>
              )}
              
              <MenuOption 
                onSelect={() => router.push("/(main)/(tabs)/profile")} 
                style={styles.optionItem}
              >
                <View style={styles.menuRow}>
                  <User size={18} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.optionText, { color: colors.text }]}>My Profile</Text>
                </View>
              </MenuOption>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
              
              <MenuOption onSelect={handleLogout} style={styles.optionItem}>
                <View style={styles.menuRow}>
                  <LogOut size={18} color="#EF4444" strokeWidth={2.5} />
                  <Text style={[styles.optionText, { color: "#EF4444" }]}>Logout</Text>
                </View>
              </MenuOption>
            </MenuOptions>
          </Menu>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
  },
  menuButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 150,
    height: 50,
    resizeMode: "contain",
  },
  rightActions: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  profileMenuContainer: {
    padding: 8,
    borderRadius: 18,
    marginTop: 45,
    width: 180,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  profileMenuHeader: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  profileRole: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 6,
    marginHorizontal: 6,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  }
});
