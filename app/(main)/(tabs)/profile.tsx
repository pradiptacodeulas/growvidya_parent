import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";

import Avatar from "@/components/common/Avatar";
import { logout, syncProfile } from "@/redux/auth/authSlice";
import { clearDashboardData } from "@/redux/home/homeSlice";
import { AppDispatch, RootState } from "@/redux/store";
import { removeData, storeData } from "@/utils/asyncStorage";
import { useAppTheme } from "@/theme";
import { getAvatarUrl, apiFetch, setAuthToken } from "@/services/apiClient";
import { disconnectSocket } from "@/services/socket.service";
import { unregisterPushToken } from "@/services/notification.service";

const Profile: React.FC = () => {
  const { themeMode, isDark, colors, setTheme } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const router = useRouter();

  const { user, loading } = useSelector((state: RootState) => state.auth);
  const { dashboardData } = useSelector((state: RootState) => state.home);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch full parent profile from backend without triggering a PUT update
  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/parent/auth/profile");
      if (res.success && res.data?.parent) {
        dispatch(syncProfile(res.data.parent));
        if (user) {
          await storeData("userData", { ...user, ...res.data.parent });
        }
      }
    } catch (err) {
      console.warn("[Profile Load Warning]:", err);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const fullName =
    user?.name ||
    user?.full_name ||
    (user?.firstName || user?.first_name || user?.lastName || user?.last_name
      ? `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim()
      : "");

  const getParentType = (u: any) => {
    if (u?.relation) return u.relation;
    const type = u?.parent_type || u?.relation_type;
    switch (String(type)) {
      case "1":
        return "Father";
      case "2":
        return "Mother";
      case "3":
        return "Others";
      default:
        return "";
    }
  };

  const parentRelation = getParentType(user);

  const fullAddress =
    [
      user?.address1,
      user?.address2,
      user?.cityName || user?.city_name,
      user?.stateName || user?.state_name,
      user?.countryName || user?.country_name,
      user?.postalCode || user?.postal_code,
    ]
      .filter(Boolean)
      .join(", ") || "—";

  const getProfileImage = () => {
    if (user?.picture) {
      return { uri: getAvatarUrl(user.picture, user?.gender) };
    }
    return { uri: getAvatarUrl(null, user?.gender) };
  };

  const childrenList = dashboardData?.parent_student || user?.children || [];
  const childrenCount = childrenList.length;

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out from GrowVidya Parent?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await unregisterPushToken();
            await apiFetch("/parent/auth/logout", { method: "POST" }).catch(() => {});
            disconnectSocket();
            setAuthToken(null);
            await removeData("userData");
            await removeData("parent_profile");
            dispatch(logout());
            dispatch(clearDashboardData());
          },
        },
      ]
    );
  };

  if (loading && !user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              style={[
                styles.menuHeaderBtn,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              activeOpacity={0.7}
            >
              <Ionicons name="menu-outline" size={22} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.headerTextCol}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Parent Profile</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                View your personal identity and account details
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
            ) : (
              <TouchableOpacity
                style={[
                  styles.menuHeaderBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={() => router.push("/student/EditProfile")}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Identity Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Avatar size={80} source={getProfileImage()} outline />
          <Text style={[styles.name, { color: colors.text }]}>{fullName || "—"}</Text>
          {!!parentRelation && (
            <Text
              style={[
                styles.idBadge,
                { color: colors.primary, backgroundColor: colors.primaryLight },
              ]}
            >
              {parentRelation}
            </Text>
          )}

          <View style={[styles.gridContainer, { borderTopColor: colors.border }]}>
            <View style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Relation</Text>
              <Text style={[styles.gridValue, { color: colors.text }]}>{parentRelation || "—"}</Text>
            </View>

            <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />

            <View style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Children</Text>
              <Text style={[styles.gridValue, { color: colors.primary }]}>
                {`${childrenCount} ${childrenCount === 1 ? "Child" : "Children"}`}
              </Text>
            </View>

            <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />

            <View style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Occupation</Text>
              <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1}>
                {user?.occupation || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Personal & Contact Info Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal & Contact Info</Text>

        <View
          style={[
            styles.infoGroup,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {/* Full Name */}
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Full Name</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{fullName || "—"}</Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Email Address */}
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email Address</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.email || user?.email_address || "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Phone Number */}
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Phone Number</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.phone || user?.primary_contact_number || "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* School Name */}
          <View style={styles.infoRow}>
            <Ionicons name="school-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>School Name</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.schoolName || user?.school_name || "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Occupation & Parent Type Split Row */}
          <View style={styles.splitInfoRow}>
            <View style={styles.halfInfoCol}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Occupation</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                  {user?.occupation || "—"}
                </Text>
              </View>
            </View>

            <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />

            <View style={styles.halfInfoCol}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Parent Type</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {parentRelation || "—"}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Address */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Address</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{fullAddress}</Text>
            </View>
          </View>
        </View>

        {/* Account Settings Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Settings</Text>

        <View
          style={[
            styles.infoGroup,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {/* Dark Mode Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={colors.primary}
              />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingSubLabel, { color: colors.textMuted }]}>
                  {themeMode === "automatic"
                    ? "System Default"
                    : isDark
                    ? "Dark Theme Enabled"
                    : "Light Theme Enabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => setTheme(val ? "dark" : "light")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/student/EditProfile")}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/student/ChangePassword")}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Notifications */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/student/Activity")}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: "#EF4444" }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out from GrowVidya</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  idBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
  },
  gridItem: {
    flex: 1,
    alignItems: "center",
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  columnDivider: {
    width: 1,
    height: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 8,
  },
  infoGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowDivider: {
    height: 1,
    marginLeft: 46,
  },
  splitInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  halfInfoCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
