import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Text,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from "react-native-popup-menu";
import {
  Menu as MenuIcon,
  MoreVertical,
  User,
  LogOut,
  Bell,
  Calendar,
  Sparkles,
  X,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { useNavigation, useRouter } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState, AppDispatch } from "@/redux/store";
import { logout } from "@/redux/auth/authSlice";
import { clearDashboardData, setSelectedStudentId } from "@/redux/home/homeSlice";
import {
  fetchAcademicYears,
  fetchDashboardData,
  switchActiveStudent,
} from "@/redux/home/homeThunk";
import { removeData } from "@/utils/asyncStorage";
import {
  apiFetch,
  getAvatarUrl,
  resolveStudentId,
  setAuthToken,
} from "@/services/apiClient";
import { disconnectSocket } from "@/services/socket.service";
import { unregisterPushToken } from "@/services/notification.service";
import { stripHtmlPreview } from "@/utils/html";
import { useAppTheme } from "@/theme";

const LAST_SEEN_NOTIF_KEY = "@parent_last_seen_notif_ts";

interface PortalNotificationItem {
  id: string;
  type: "notice" | "activity";
  title: string;
  message: string;
  dateStr: string;
  timestamp: number;
}

export default function CustomHeader() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const {
    dashboardData,
    selectedStudentId,
    activeAcademicYear,
    academicYears,
  } = useSelector((state: RootState) => state.home);

  const [notifications, setNotifications] = useState<PortalNotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [lastSeenTs, setLastSeenTs] = useState<number>(0);

  const activeChildId = resolveStudentId(
    undefined,
    selectedStudentId,
    dashboardData,
    user
  );

  const childrenList: any[] = useMemo(() => {
    const raw = dashboardData?.parent_student || user?.children || [];
    return Array.isArray(raw) ? raw : [];
  }, [dashboardData?.parent_student, user?.children]);

  const activeChild = useMemo(() => {
    if (dashboardData?.student_details) return dashboardData.student_details;
    if (activeChildId && childrenList.length > 0) {
      const found = childrenList.find(
        (c: any) => String(c.student_id || c.id) === String(activeChildId)
      );
      if (found) return found;
    }
    return user?.activeChild || childrenList[0] || null;
  }, [dashboardData?.student_details, activeChildId, childrenList, user?.activeChild]);

  const displayName =
    user?.name ||
    user?.full_name ||
    (user?.first_name || user?.firstName
      ? `${user.first_name || user.firstName} ${user.last_name || user.lastName || ""}`.trim()
      : "");

  // Fetch Academic Years once
  useEffect(() => {
    if (!activeAcademicYear && academicYears.length === 0 && user) {
      dispatch(fetchAcademicYears());
    }
  }, [activeAcademicYear, academicYears.length, user, dispatch]);

  // Load last seen notification timestamp
  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_NOTIF_KEY)
      .then((val) => {
        if (val) {
          const parsed = Number(val);
          if (!Number.isNaN(parsed)) setLastSeenTs(parsed);
        }
      })
      .catch(() => {});
  }, []);

  // Load School Notices + Student Activities for Notification Bell
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const studentQuery = activeChildId ? `?student_id=${activeChildId}` : "";
      const [noticeRes, actRes] = await Promise.all([
        apiFetch(`/parent/child/notices${studentQuery}`, { method: "GET" }).catch(
          () => null
        ),
        activeChildId
          ? apiFetch(`/parent/child/activities?student_id=${activeChildId}`, {
              method: "GET",
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const rawNotices = noticeRes?.success
        ? Array.isArray(noticeRes.data)
          ? noticeRes.data
          : Array.isArray(noticeRes.data?.notices)
          ? noticeRes.data.notices
          : []
        : [];

      const rawActivities = actRes?.success
        ? Array.isArray(actRes.data)
          ? actRes.data
          : []
        : [];

      const mappedNotices: PortalNotificationItem[] = rawNotices
        .slice(0, 10)
        .map((n: any, idx: number) => {
          const rawDate = n.publish_on || n.notice_date || n.created_at || "";
          const ts = rawDate ? new Date(rawDate).getTime() || 0 : 0;
          return {
            id: `notice_${n.id || idx}`,
            type: "notice",
            title: n.title || "School Notice",
            message: stripHtmlPreview(n.message || n.description || ""),
            dateStr: rawDate ? String(rawDate).split("T")[0].split(" ")[0] : "",
            timestamp: ts,
          };
        });

      const mappedActivities: PortalNotificationItem[] = rawActivities
        .slice(0, 5)
        .map((a: any, idx: number) => {
          const rawDate = a.date || a.created_at || "";
          const ts = rawDate ? new Date(rawDate).getTime() || 0 : 0;
          return {
            id: `act_${a.id || idx}`,
            type: "activity",
            title: "Student Activity Logged",
            message: stripHtmlPreview(
              a.activity_description || a.description || a.title || "New student activity recorded"
            ),
            dateStr: rawDate ? String(rawDate).split("T")[0].split(" ")[0] : "",
            timestamp: ts,
          };
        });

      const combined = [...mappedNotices, ...mappedActivities].sort(
        (a, b) => b.timestamp - a.timestamp
      );
      setNotifications(combined);
    } catch {
      // Ignore notification fetch errors silently
    } finally {
      setNotifLoading(false);
    }
  }, [user, activeChildId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    if (notifications.length === 0) return 0;
    if (!lastSeenTs) return notifications.length;
    return notifications.filter((n) => n.timestamp > lastSeenTs).length;
  }, [notifications, lastSeenTs]);

  const handleOpenNotifications = async () => {
    setNotifModalVisible(true);
    const nowTs = Date.now();
    setLastSeenTs(nowTs);
    AsyncStorage.setItem(LAST_SEEN_NOTIF_KEY, String(nowTs)).catch(() => {});
    loadNotifications();
  };

  const handleSwitchChild = async (studentId: string) => {
    if (String(activeChildId) === String(studentId)) return;
    dispatch(setSelectedStudentId(String(studentId)));
    try {
      await dispatch(switchActiveStudent(String(studentId))).unwrap();
    } catch {
      dispatch(fetchDashboardData(String(studentId)));
    }
  };

  const handleLogout = async () => {
    await unregisterPushToken();
    await apiFetch("/parent/auth/logout", { method: "POST" }).catch(() => {});
    disconnectSocket();
    setAuthToken(null);
    await removeData("userData");
    await removeData("parent_profile");
    dispatch(logout());
    dispatch(clearDashboardData());
  };

  return (
    <View
      style={[
        styles.headerWrapper,
        {
          paddingTop: Math.max(insets.top, 10),
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.border,
        },
      ]}
    >
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
            source={
              isDark
                ? require("@/assets/images/logo_dark.png")
                : require("@/assets/images/logo.png")
            }
            style={styles.logo}
          />
        </View>

        {/* Right: Notification Bell + Profile Menu */}
        <View style={styles.rightActionsRow}>
          <TouchableOpacity
            onPress={handleOpenNotifications}
            activeOpacity={0.75}
            style={[
              styles.actionButton,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Bell size={19} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Menu>
            <MenuTrigger>
              <View
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <MoreVertical size={20} color={colors.textSecondary} />
              </View>
            </MenuTrigger>
            <MenuOptions
              optionsContainerStyle={[
                styles.profileMenuContainer,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              {!!displayName && (
                <>
                  <View style={styles.profileMenuHeader}>
                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {displayName}
                    </Text>
                    {!!user?.relation && (
                      <Text style={[styles.profileRole, { color: colors.textMuted }]}>
                        {user.relation}
                      </Text>
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

      {/* Secondary Context Bar: Active Academic Year */}
      {!!activeAcademicYear && (
        <View
          style={[
            styles.contextBar,
            { borderTopColor: colors.border, backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <View
            style={[
              styles.sessionBadge,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Calendar size={12} color={colors.primary} />
            <Text style={[styles.sessionBadgeText, { color: colors.textSecondary }]}>
              Session:{" "}
              <Text style={{ fontWeight: "800", color: colors.text }}>
                {activeAcademicYear}
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* Global Notifications Modal */}
      <Modal
        visible={notifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.notifModalCard,
              {
                backgroundColor: colors.cardBg,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={[styles.notifModalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.notifHeaderTitleRow}>
                <View style={[styles.notifIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Bell size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.notifModalTitle, { color: colors.text }]}>
                    Notifications & Alerts
                  </Text>
                  <Text style={[styles.notifModalSub, { color: colors.textMuted }]}>
                    Recent school notices & student activities
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setNotifModalVisible(false)}
                style={[styles.closeCircle, { backgroundColor: colors.surfaceSubtle }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.notifScroll}
              contentContainerStyle={styles.notifScrollInner}
              showsVerticalScrollIndicator={false}
            >
              {notifLoading && notifications.length === 0 ? (
                <View style={styles.notifEmptyWrap}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.notifEmptySub, { color: colors.textMuted, marginTop: 8 }]}>
                    Loading notifications...
                  </Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.notifEmptyWrap}>
                  <Bell size={34} color={colors.textMuted} />
                  <Text style={[styles.notifEmptyTitle, { color: colors.text }]}>
                    All Caught Up!
                  </Text>
                  <Text style={[styles.notifEmptySub, { color: colors.textSecondary }]}>
                    No recent notices or student activities to show right now.
                  </Text>
                </View>
              ) : (
                notifications.map((item) => {
                  const isNotice = item.type === "notice";
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setNotifModalVisible(false);
                        router.push({
                          pathname: isNotice ? "/student/NoticeBoard" : "/student/Activity",
                          params: activeChildId
                            ? { student_id: String(activeChildId) }
                            : {},
                        } as any);
                      }}
                      style={[
                        styles.notifItemCard,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.notifTypeIcon,
                          {
                            backgroundColor: isNotice
                              ? colors.primaryLight
                              : "rgba(139, 92, 246, 0.14)",
                          },
                        ]}
                      >
                        {isNotice ? (
                          <Bell size={16} color={colors.primary} />
                        ) : (
                          <Sparkles size={16} color="#8B5CF6" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.notifTitleRow}>
                          <Text
                            style={[styles.notifItemTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          {!!item.dateStr && (
                            <Text style={[styles.notifDateText, { color: colors.textMuted }]}>
                              {item.dateStr}
                            </Text>
                          )}
                        </View>
                        {!!item.message && (
                          <Text
                            style={[styles.notifItemBody, { color: colors.textSecondary }]}
                            numberOfLines={2}
                          >
                            {item.message}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.notifFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.notifFooterBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setNotifModalVisible(false);
                  router.push({
                    pathname: "/student/NoticeBoard",
                    params: activeChildId ? { student_id: String(activeChildId) } : {},
                  } as any);
                }}
              >
                <Text style={styles.notifFooterBtnText}>Open Notice Board</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 14,
    height: 58,
  },
  menuButton: {
    width: 44,
    height: 44,
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
    width: 144,
    height: 46,
    resizeMode: "contain",
  },
  rightActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
  },
  contextBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
    gap: 8,
  },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  childQuickPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 190,
  },
  childMiniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  childQuickName: {
    fontSize: 11.5,
    fontWeight: "700",
    maxWidth: 115,
  },
  childStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  childMenuContainer: {
    padding: 8,
    borderRadius: 16,
    marginTop: 34,
    width: 255,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  childMenuTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  childMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  childMenuAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  childMenuNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  childMenuName: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  statusMiniTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  childMenuSub: {
    fontSize: 11,
    marginTop: 1,
  },
  profileMenuContainer: {
    padding: 8,
    borderRadius: 18,
    marginTop: 45,
    width: 185,
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
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  notifModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  notifModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  notifHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notifModalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  notifModalSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  notifScroll: {
    paddingHorizontal: 16,
  },
  notifScrollInner: {
    paddingVertical: 14,
    gap: 10,
  },
  notifEmptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  notifEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  notifEmptySub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  notifItemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  notifTypeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 3,
  },
  notifItemTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    flex: 1,
  },
  notifDateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  notifItemBody: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  notifFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  notifFooterBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notifFooterBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
});
