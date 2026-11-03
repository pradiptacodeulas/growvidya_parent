import Avatar from "@/components/common/Avatar";
import SubHeader from "@/components/dashboard/SubHeader";
import { logout } from "@/redux/auth/authSlice";
import { clearDashboardData } from "@/redux/home/homeSlice";
import { AppDispatch, RootState } from "@/redux/store";
import { removeData } from "@/utils/asyncStorage";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  Edit3,
  Fingerprint,
  GraduationCap,
  Heart,
  MapPin,
  User
} from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useAppTheme } from "@/theme";
import { getAvatarUrl, resolveStudentId, apiFetch } from "@/services/apiClient";

const { width } = Dimensions.get("window");

const Profile = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading: authLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const { dashboardData, selectedStudentId, loading: homeLoading } = useSelector(
    (state: RootState) => state.home,
  );

  const [childProfile, setChildProfile] = React.useState<any>(null);
  const [profileLoading, setProfileLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  const loadChildProfile = React.useCallback(async (isRefresh = false) => {
    if (!targetStudentId) return;
    if (isRefresh) setRefreshing(true);
    else if (!childProfile) setProfileLoading(true);

    try {
      const res = await apiFetch(`/parent/child/profile?student_id=${targetStudentId}`);
      if (res.success && res.data) {
        setChildProfile(res.data);
      }
    } catch (e) {
      console.warn("[Child Profile Load Warning]:", e);
    } finally {
      setProfileLoading(false);
      setRefreshing(false);
    }
  }, [targetStudentId, childProfile]);

  React.useEffect(() => {
    loadChildProfile();
  }, [loadChildProfile]);

  React.useEffect(() => {
    if (!dashboardData && !homeLoading) {
      dispatch(fetchDashboardData(targetStudentId ? String(targetStudentId) : undefined));
    }
  }, [dashboardData, homeLoading, targetStudentId, dispatch]);

  const student = childProfile || dashboardData?.student_details;
  const loading = (authLoading || homeLoading || profileLoading) && !student;

  const handleLogout = async () => {
    await removeData("userData");
    await removeData("parent_profile");
    dispatch(logout());
    dispatch(clearDashboardData());
  };

  if (loading && !student) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const studentFullName =
    student?.full_name ||
    (student
      ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
      : "Student Name");

  const studentInfo = [
    {
      label: "Full Name",
      value: studentFullName || "N/A",
      icon: User,
      color: "#4F46E5",
    },
    {
      label: "Admission Number",
      value: student?.admission_number || "N/A",
      icon: Fingerprint,
      color: "#7C3AED",
    },
    {
      label: "Class & Section",
      value: student?.class_name
        ? `Class ${student.class_name}${student.section_name ? ` - ${student.section_name}` : ""}`
        : "N/A",
      icon: GraduationCap,
      color: "#C026D3",
    },
    {
      label: "Roll Number",
      value:
        student?.roll_number !== undefined && student?.roll_number !== null && student?.roll_number !== ""
          ? String(student.roll_number)
          : "N/A",
      icon: Edit3,
      color: "#2563EB",
    },
    {
      label: "Admission Date",
      value: student?.admission_date
        ? new Date(student.admission_date).toLocaleDateString()
        : "N/A",
      icon: Calendar,
      color: "#EF4444",
    },
  ];

  const personalInfo = [
    {
      label: "Date of Birth",
      value: student?.date_of_birth
        ? new Date(student.date_of_birth).toLocaleDateString()
        : "N/A",
      icon: Calendar,
      color: "#16A34A",
    },
    {
      label: "Gender",
      value:
        student?.gender_name ||
        (Number(student?.gender) === 1
          ? "Male"
          : Number(student?.gender) === 2
          ? "Female"
          : "N/A"),
      icon: User,
      color: "#EA580C",
    },
    {
      label: "Blood Group",
      value: student?.blood_group_name || student?.blood_group || "N/A",
      icon: Heart,
      color: "#E11D48",
    },
    {
      label: "Emergency Contact",
      value: student?.primary_contact_number || student?.phone || "N/A",
      icon: User,
      color: "#059669",
    },
    {
      label: "Address",
      value: student?.address_info
        ? [
            student.address_info.address1,
            student.address_info.city_name,
            student.address_info.state_name,
            student.address_info.country_name,
          ]
            .filter(Boolean)
            .join(", ")
        : [student?.address1, student?.city_name, student?.state_name]
            .filter(Boolean)
            .join(", ") || "N/A",
      icon: MapPin,
      color: "#6366F1",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* --- EXPANDED STICKY APP BAR --- */}
      <SubHeader
        title="Profile"
        isGradient={true}
        style={styles.heroBackground}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarBorder, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)" }]}>
              <Avatar
                size={100}
                source={
                  student?.picture
                    ? { uri: getAvatarUrl(student.picture, student.gender) }
                    : studentFullName
                    ? {
                        uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          studentFullName
                        )}&background=4f46e5&color=fff&size=150&bold=true`,
                      }
                    : null
                }
              />
            </View>
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.userName}>
              {studentFullName}
            </Text>
            <View style={styles.schoolBadge}>
              <GraduationCap
                size={14}
                color="rgba(255,255,255,0.8)"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.schoolText}>
                {student?.class_name ? `Class ${student.class_name}${student.section_name ? `-${student.section_name}` : ""}` : "N/A"}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.dot} />
              <Text style={styles.statusText}>STUDENT PROFILE</Text>
            </View>
          </View>
        </View>
      </SubHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              loadChildProfile(true);
              if (targetStudentId) {
                dispatch(fetchDashboardData(String(targetStudentId)));
              }
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* --- MAIN CONTENT --- */}
        <View style={styles.content}>
          <SectionTitle title="Academic Information" colors={colors} />
          <InfoCard data={studentInfo} colors={colors} />

          <SectionTitle title="Personal Details" colors={colors} />
          <InfoCard data={personalInfo} colors={colors} />
        </View>
      </ScrollView>
    </View>
  );
};

const SectionTitle = ({ title, colors }: { title: string; colors: any }) => (
  <View style={styles.sectionTitleWrapper}>
    <View style={[styles.sectionTitleDecorator, { backgroundColor: colors.primary }]} />
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
  </View>
);

const InfoCard = ({ data, colors }: { data: any[]; colors: any }) => (
  <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
    {data.map((item, index) => (
      <View
        key={index}
        style={[
          styles.infoRow,
          { borderBottomColor: colors.border },
          index === data.length - 1 && { borderBottomWidth: 0 },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: item.color + "18" }]}>
          <item.icon size={20} color={item.color} />
        </View>
        <View style={styles.infoTextWrapper}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{item.label}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
        </View>
      </View>
    ))}
  </View>
);

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroBackground: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: 25,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 25,
    width: "100%",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarBorder: {
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 55,
  },
  editBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#FFF",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  nameSection: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  schoolBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  schoolText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.8,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginLeft: 5,
  },
  sectionTitleDecorator: {
    width: 4,
    height: 18,
    backgroundColor: "#4F46E5",
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "700",
  },
  logoutBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginTop: 10,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EF4444",
  },
});
