import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import ChildCards from "@/components/tabs/ChildCards";
import Header from "@/components/dashboard/Header";
import Avatar from "@/components/common/Avatar";
import { useAppTheme } from "@/theme";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setSelectedStudentId } from "@/redux/home/homeSlice";
import { fetchDashboardData, switchActiveStudent } from "@/redux/home/homeThunk";
import { getAvatarUrl, resolveStudentId } from "@/services/apiClient";
import { CheckCircle2, UserCheck, Sparkles, GraduationCap } from "lucide-react-native";
import Toast from "react-native-toast-message";

const StudentsTab = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useAppTheme();

  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId, loading } = useSelector(
    (state: RootState) => state.home
  );

  const [refreshing, setRefreshing] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const children = dashboardData?.parent_student || user?.children || [];
  const activeStudent = dashboardData?.student_details || (children.length > 0 ? children[0] : null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const targetId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
    await dispatch(fetchDashboardData(targetId ? String(targetId) : undefined));
    setRefreshing(false);
  }, [dispatch, selectedStudentId, dashboardData, user]);

  const handleSelectChild = async (childId: string | number) => {
    const idStr = String(childId);
    if (idStr === String(selectedStudentId)) return;

    setSwitchingId(idStr);
    try {
      dispatch(setSelectedStudentId(idStr));
      await dispatch(switchActiveStudent(idStr)).unwrap();
      Toast.show({
        type: "success",
        text1: "Active Student Switched",
        text2: "Now viewing dashboard for selected child.",
      });
    } catch (e: any) {
      // Fallback local fetch
      dispatch(fetchDashboardData(idStr));
    } finally {
      setSwitchingId(null);
    }
  };

  const menuItems = [
    { id: "1", title: "Profile", color: "#6366F1", icon: "user", family: "AntDesign" },
    { id: "2", title: "Fees", color: "#10B981", icon: "wallet", family: "AntDesign" },
    { id: "3", title: "Attendance", color: "#F59E0B", icon: "calendar", family: "AntDesign" },
    { id: "4", title: "Exam Result", color: "#3B82F6", icon: "book", family: "AntDesign" },
    { id: "5", title: "Activity", color: "#8B5CF6", icon: "tasks", family: "FontAwesome" },
    { id: "6", title: "Events", color: "#0EA5E9", icon: "calendar", family: "FontAwesome" },
    { id: "7", title: "Transport", color: "#EC4899", icon: "car", family: "AntDesign" },
    { id: "8", title: "Hostel", color: "#06B6D4", icon: "home", family: "AntDesign" },
    { id: "9", title: "Medical", color: "#EF4444", icon: "heartbeat", family: "FontAwesome" },
    { id: "10", title: "Document", color: "#F97316", icon: "file-text", family: "FontAwesome" },
    { id: "11", title: "Study Material", color: "#14B8A6", icon: "book", family: "FontAwesome" },
    { id: "12", title: "Syllabus", color: "#D97706", icon: "book", family: "AntDesign" },
    { id: "13", title: "Holidays", color: "#E11D48", icon: "calendar-check-o", family: "FontAwesome" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.pageHeading, { color: colors.text }]}>My Children</Text>
          <Text style={[styles.pageSubheading, { color: colors.textSecondary }]}>
            Select a child to view their academic records, attendance, and fees
          </Text>
        </View>

        {/* Children List */}
        <View style={styles.childrenList}>
          {children.length > 0 ? (
            children.map((child: any) => {
              const childId = String(child.student_id || child.id);
              const isSelected = String(selectedStudentId) === childId || (!selectedStudentId && String(activeStudent?.id) === childId);
              const isSwitching = switchingId === childId;

              return (
                <TouchableOpacity
                  key={childId}
                  style={[
                    styles.childCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectChild(childId)}
                >
                  <View style={styles.childHeader}>
                    <Avatar
                      size={60}
                      outline={isSelected}
                      source={
                        child.picture
                          ? { uri: getAvatarUrl(child.picture, child.gender) }
                          : null
                      }
                    />

                    <View style={styles.childInfo}>
                      <View style={styles.childNameRow}>
                        <Text style={[styles.childName, { color: colors.text }]} numberOfLines={1}>
                          {child.first_name} {child.last_name}
                        </Text>
                        {isSelected && (
                          <View style={[styles.activeTag, { backgroundColor: colors.primaryLight }]}>
                            <CheckCircle2 size={12} color={colors.primary} />
                            <Text style={[styles.activeTagText, { color: colors.primary }]}>Active</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.childMeta, { color: colors.textSecondary }]}>
                        Class {child.class_name || "N/A"} - {child.section_name || "N/A"}
                      </Text>

                      <View style={styles.badgeRow}>
                        <View style={[styles.pillBadge, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={[styles.pillText, { color: colors.textMuted }]}>
                            Roll: {child.roll_number || "N/A"}
                          </Text>
                        </View>
                        <View style={[styles.pillBadge, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={[styles.pillText, { color: colors.textMuted }]}>
                            ID: {child.admission_number || `ADM-${childId}`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isSwitching && (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No linked student accounts found.
              </Text>
            </View>
          )}
        </View>

        {/* Modules Grid Header */}
        <View style={styles.gridSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {activeStudent ? `${activeStudent.first_name}'s Modules` : "Student Modules"}
          </Text>
          <View style={[styles.categoryPill, { backgroundColor: colors.surfaceSubtle }]}>
            <GraduationCap size={12} color={colors.primary} />
            <Text style={[styles.categoryText, { color: colors.primary }]}>Quick Access</Text>
          </View>
        </View>

        {/* Modules Grid */}
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <ChildCards
              key={item.id}
              innerText={item.title}
              color={item.color}
              iconName={item.icon as any}
              iconFamily={item.family as any}
              onPress={() => {
                const currentStudentId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
                router.push({
                  pathname: `/student/${item.title.replaceAll(" ", "")}`,
                  params: {
                    root: "child",
                    ...(currentStudentId ? { student_id: String(currentStudentId) } : {}),
                  },
                } as any);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default StudentsTab;

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 16,
  },
  pageHeading: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  pageSubheading: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  childrenList: {
    gap: 12,
    marginBottom: 24,
  },
  childCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  childInfo: {
    flex: 1,
  },
  childNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  childName: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
  childMeta: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  gridSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
