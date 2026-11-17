import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Check, ChevronDown, ChevronLeft } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Menu, MenuOption, MenuOptions, MenuTrigger } from "react-native-popup-menu";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { setSelectedStudentId } from "@/redux/home/homeSlice";
import { fetchDashboardData, switchActiveStudent } from "@/redux/home/homeThunk";
import { getAvatarUrl, resolveStudentId } from "@/services/apiClient";
import { useAppTheme } from "@/theme";

interface DashboardSubHeaderProps {
  title: string;
  isGradient?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export default function DashboardSubHeader({
  title,
  isGradient,
  children,
  style,
}: DashboardSubHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <>
      <StatusBar style={isGradient ? "light" : colors.statusBarStyle} />
      {isGradient ? (
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.headerWrapper,
            styles.headerWrapperGradient,
            { paddingTop: insets.top },
            style,
          ]}
        >
          <HeaderContent
            title={title}
            isGradient={isGradient}
            router={router}
            colors={colors}
          />
          {children}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.headerWrapper,
            {
              paddingTop: insets.top,
              backgroundColor: colors.headerBg,
              borderBottomColor: colors.border,
            },
            style,
          ]}
        >
          <HeaderContent
            title={title}
            isGradient={isGradient}
            router={router}
            colors={colors}
          />
          {children}
        </View>
      )}
    </>
  );
}

function HeaderContent({
  title,
  isGradient,
  router,
  colors,
}: {
  title: string;
  isGradient?: boolean;
  router: any;
  colors: any;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector(
    (state: RootState) => state.home
  );

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

  const handleSelectChild = async (childId: string) => {
    if (String(activeChildId) === String(childId)) return;
    dispatch(setSelectedStudentId(String(childId)));
    try {
      router.setParams?.({ student_id: String(childId) });
    } catch {
      // Ignore if current route does not accept setParams
    }
    try {
      await dispatch(switchActiveStudent(String(childId))).unwrap();
    } catch {
      dispatch(fetchDashboardData(String(childId)));
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Left: Back Button */}
      <TouchableOpacity
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(main)/(tabs)");
          }
        }}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isGradient
                ? "rgba(255,255,255,0.2)"
                : colors.surfaceSubtle,
            },
          ]}
        >
          <ChevronLeft size={22} color={isGradient ? "#FFF" : colors.primary} />
        </View>
      </TouchableOpacity>

      {/* Center: Title */}
      <View style={styles.titleContainer}>
        <Text
          style={[styles.headerTitle, { color: isGradient ? "#FFF" : colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right: Global Child Switcher across sub-screens */}
      {activeChild && childrenList.length > 0 ? (
        <Menu>
          <MenuTrigger>
            <View
              style={[
                styles.childTrigger,
                {
                  backgroundColor: isGradient
                    ? "rgba(255,255,255,0.2)"
                    : colors.surfaceSubtle,
                  borderColor: isGradient ? "rgba(255,255,255,0.3)" : colors.border,
                },
              ]}
            >
              <Image
                source={{
                  uri: getAvatarUrl(activeChild.picture, activeChild.gender),
                }}
                style={styles.childTriggerAvatar}
              />
              {childrenList.length > 1 && (
                <ChevronDown
                  size={13}
                  color={isGradient ? "#FFF" : colors.textSecondary}
                />
              )}
            </View>
          </MenuTrigger>

          <MenuOptions
            optionsContainerStyle={[
              styles.childMenuContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.childMenuTitle, { color: colors.textMuted }]}>
              SWITCH ACTIVE CHILD
            </Text>
            {childrenList.map((child: any) => {
              const cid = String(child.student_id || child.id);
              const isCurrent = String(activeChildId) === cid;
              const isActiveStatus =
                Number(child.student_status ?? child.status ?? 1) === 1;
              const cName =
                `${child.first_name || ""} ${child.last_name || ""}`.trim() ||
                child.full_name ||
                "Student";

              return (
                <MenuOption
                  key={cid}
                  onSelect={() => handleSelectChild(cid)}
                  style={[
                    styles.childMenuItem,
                    isCurrent && { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Image
                    source={{ uri: getAvatarUrl(child.picture, child.gender) }}
                    style={styles.childMenuAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.childMenuNameRow}>
                      <Text
                        style={[styles.childMenuName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {cName}
                      </Text>
                      <View
                        style={[
                          styles.statusTag,
                          {
                            backgroundColor: isActiveStatus
                              ? "rgba(16,185,129,0.14)"
                              : "rgba(239,68,68,0.14)",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 9.5,
                            fontWeight: "800",
                            color: isActiveStatus ? "#10B981" : "#EF4444",
                          }}
                        >
                          {isActiveStatus ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.childMenuSub, { color: colors.textMuted }]}>
                      Class {child.class_name || "-"}
                      {child.section_name ? ` (${child.section_name})` : ""}
                    </Text>
                  </View>
                  {isCurrent && <Check size={16} color={colors.primary} />}
                </MenuOption>
              );
            })}
          </MenuOptions>
        </Menu>
      ) : (
        <View style={styles.rightSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    overflow: "hidden",
  },
  headerWrapperGradient: {
    borderBottomWidth: 0,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    width: 48,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  rightSpacer: {
    width: 48,
  },
  childTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  childTriggerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  childMenuContainer: {
    padding: 8,
    borderRadius: 16,
    marginTop: 42,
    width: 250,
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
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  childMenuSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
