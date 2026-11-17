import Avatar from "@/components/common/Avatar";
import SubHeader from "@/components/dashboard/SubHeader";
import { AppDispatch, RootState } from "@/redux/store";
import {
  Award,
  Calendar,
  CreditCard,
  Edit3,
  FileSpreadsheet,
  Fingerprint,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Languages,
  Mail,
  MapPin,
  Sparkles,
  User,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useAppTheme } from "@/theme";
import { getAvatarUrl, resolveStudentId, apiFetch } from "@/services/apiClient";

const Profile = () => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading: authLoading } = useSelector(
    (state: RootState) => state.auth
  );
  const { dashboardData, selectedStudentId, loading: homeLoading } = useSelector(
    (state: RootState) => state.home
  );

  const [childProfile, setChildProfile] = React.useState<any>(null);
  const [profileLoading, setProfileLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  const targetStudentId = resolveStudentId(
    params.student_id,
    selectedStudentId,
    dashboardData,
    user
  );

  const loadChildProfile = React.useCallback(
    async (isRefresh = false) => {
      if (!targetStudentId) return;
      if (isRefresh) setRefreshing(true);
      else setProfileLoading(true);

      try {
        const res = await apiFetch(
          `/parent/child/profile?student_id=${targetStudentId}`
        );
        if (res.success && res.data) {
          setChildProfile(res.data);
        }
      } catch (e) {
        console.warn("[Child Profile Load Warning]:", e);
      } finally {
        setProfileLoading(false);
        setRefreshing(false);
      }
    },
    [targetStudentId]
  );

  React.useEffect(() => {
    setChildProfile(null);
    loadChildProfile();
  }, [loadChildProfile]);

  React.useEffect(() => {
    if (!dashboardData && !homeLoading) {
      dispatch(
        fetchDashboardData(targetStudentId ? String(targetStudentId) : undefined)
      );
    }
  }, [dashboardData, homeLoading, targetStudentId, dispatch]);

  const student = childProfile || dashboardData?.student_details;
  const loading = (authLoading || homeLoading || profileLoading) && !student;

  if (loading && !student) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const studentFullName =
    student?.full_name ||
    (student
      ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
      : "Student Name");

  const isStudentActive =
    Number(student?.student_status ?? student?.status ?? 1) === 1;

  const casteCategory = [
    student?.caste,
    student?.category_name || student?.category,
  ]
    .filter(Boolean)
    .join(" / ");

  const languagesVal = Array.isArray(student?.languages_known)
    ? student.languages_known.join(", ")
    : student?.languages_known || student?.language_known || "N/A";

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
        ? `Class ${student.class_name}${
            student.section_name ? ` - ${student.section_name}` : ""
          }`
        : "N/A",
      icon: GraduationCap,
      color: "#C026D3",
    },
    {
      label: "Roll Number",
      value:
        student?.roll_number !== undefined &&
        student?.roll_number !== null &&
        student?.roll_number !== ""
          ? String(student.roll_number)
          : "N/A",
      icon: Edit3,
      color: "#2563EB",
    },
    {
      label: "School House",
      value:
        student?.house_name ||
        student?.house ||
        student?.school_house ||
        "N/A",
      icon: Home,
      color: "#0EA5E9",
    },
    {
      label: "Admission Date",
      value: student?.admission_date
        ? new Date(student.admission_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A",
      icon: Calendar,
      color: "#EF4444",
    },
  ];

  const personalInfo = [
    {
      label: "Date of Birth",
      value:
        student?.date_of_birth || student?.dob
          ? new Date(student.date_of_birth || student.dob).toLocaleDateString(
              "en-GB",
              { day: "2-digit", month: "short", year: "numeric" }
            )
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
          : student?.gender || "N/A"),
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
      label: "Religion",
      value: student?.religion_name || student?.religion || "N/A",
      icon: Sparkles,
      color: "#D97706",
    },
    {
      label: "Caste / Category",
      value: casteCategory || "N/A",
      icon: Globe,
      color: "#8B5CF6",
    },
    {
      label: "Mother Tongue",
      value: student?.mother_tongue_name || student?.mother_tongue || "N/A",
      icon: Languages,
      color: "#0D9488",
    },
    {
      label: "Languages Known",
      value: languagesVal || "N/A",
      icon: Languages,
      color: "#0284C7",
    },
    {
      label: "Student Email",
      value: student?.email_address || student?.email || "N/A",
      icon: Mail,
      color: "#4F46E5",
    },
    {
      label: "Emergency Contact",
      value:
        student?.primary_contact_number ||
        student?.phone ||
        student?.mobile ||
        "N/A",
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
            .join(", ") || "N/A"
        : [student?.address1, student?.city_name, student?.state_name]
            .filter(Boolean)
            .join(", ") || "N/A",
      icon: MapPin,
      color: "#6366F1",
    },
  ];

  const navigateQuickAction = (routePath: string) => {
    router.push({
      pathname: routePath,
      params: targetStudentId ? { student_id: String(targetStudentId) } : {},
    } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Student Profile" isGradient={true} style={styles.heroBackground}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View
              style={[
                styles.avatarBorder,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.25)",
                },
              ]}
            >
              <Avatar
                size={96}
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
            <Text style={styles.userName} numberOfLines={2}>
              {studentFullName}
            </Text>
            <View style={styles.schoolBadge}>
              <GraduationCap
                size={14}
                color="rgba(255,255,255,0.85)"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.schoolText}>
                {student?.class_name
                  ? `Class ${student.class_name}${
                      student.section_name ? ` (${student.section_name})` : ""
                    }`
                  : "N/A"}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isStudentActive
                    ? "rgba(16, 185, 129, 0.22)"
                    : "rgba(239, 68, 68, 0.25)",
                  borderColor: isStudentActive
                    ? "rgba(74, 222, 128, 0.45)"
                    : "rgba(248, 113, 113, 0.5)",
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isStudentActive ? "#4ADE80" : "#F87171" },
                ]}
              />
              <Text style={styles.statusText}>
                {isStudentActive ? "ACTIVE STUDENT" : "INACTIVE STUDENT"}
              </Text>
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
        <View style={styles.content}>
          {/* Quick Actions Matching Web ParentChildProfile */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
              onPress={() => navigateQuickAction("/student/Fees")}
            >
              <CreditCard size={16} color="#10B981" />
              <Text style={[styles.quickActionText, { color: colors.text }]}>
                Fee Invoices
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
              onPress={() => navigateQuickAction("/student/Attendance")}
            >
              <FileSpreadsheet size={16} color="#F59E0B" />
              <Text style={[styles.quickActionText, { color: colors.text }]}>
                Attendance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
              onPress={() => navigateQuickAction("/student/ExamResult")}
            >
              <Award size={16} color="#3B82F6" />
              <Text style={[styles.quickActionText, { color: colors.text }]}>
                Exam Results
              </Text>
            </TouchableOpacity>
          </View>

          <SectionTitle title="Academic Information" colors={colors} />
          <InfoCard data={studentInfo} colors={colors} />

          <SectionTitle title="Personal & Demographic Details" colors={colors} />
          <InfoCard data={personalInfo} colors={colors} />
        </View>
      </ScrollView>
    </View>
  );
};

const SectionTitle = ({ title, colors }: { title: string; colors: any }) => (
  <View style={styles.sectionTitleWrapper}>
    <View
      style={[styles.sectionTitleDecorator, { backgroundColor: colors.primary }]}
    />
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
  </View>
);

const InfoCard = ({ data, colors }: { data: any[]; colors: any }) => (
  <View
    style={[
      styles.infoCard,
      { backgroundColor: colors.cardBg, borderColor: colors.border },
    ]}
  >
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
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            {item.label}
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {item.value}
          </Text>
        </View>
      </View>
    ))}
  </View>
);

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: 24,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    width: "100%",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 55,
  },
  nameSection: {
    marginLeft: 18,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  schoolBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  schoolText: {
    fontSize: 13.5,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.7,
  },
  content: {
    paddingHorizontal: 18,
    marginTop: 20,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  sectionTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginLeft: 4,
  },
  sectionTitleDecorator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14.5,
    fontWeight: "700",
  },
});
