import Avatar from "@/components/common/Avatar";
import {
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import {
  Activity,
  Bed,
  BookOpen,
  BookMarked,
  BriefcaseMedical,
  Calendar,
  CalendarDays,
  Clock,
  Car,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Gauge,
  GraduationCap,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect } from "react";
import {
  Dimensions,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { AppDispatch, RootState } from "@/redux/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";
import { getAvatarUrl, resolveStudentId } from "@/services/apiClient";

export default function MainLayout() {
  const windowWidth = Dimensions.get("window").width;
  const insets = useSafeAreaInsets();
  const iconSize = 20;

  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useAppTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, loading, error, selectedStudentId } = useSelector((state: RootState) => state.home);

  useEffect(() => {
    if (user && !dashboardData && !loading && !error) {
      const targetId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
      dispatch(fetchDashboardData(targetId ? String(targetId) : undefined));
    }
  }, [user, selectedStudentId, dashboardData, loading, error, dispatch]);

  const DrawerHeader = ({ drawerProps }: { drawerProps: any }) => {
    const selectedStudent = dashboardData?.student_details;
    const schoolName =
      selectedStudent?.school_name ||
      dashboardData?.parent?.schoolName ||
      (user as any)?.schoolName ||
      (user as any)?.school_name ||
      "";

    return (
      <View style={[styles.drawerHeader, { paddingTop: Math.max(insets.top + 10, 24), backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.avatarContainer}>
            <Avatar
              size={54}
              source={
                selectedStudent?.picture
                  ? { uri: getAvatarUrl(selectedStudent.picture, selectedStudent?.gender) }
                  : null
              }
            />
          </View>
          <Pressable 
            onPress={() => drawerProps.navigation.closeDrawer()}
            style={[styles.closeBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
            hitSlop={8}
          >
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
        {schoolName ? (
          <View style={styles.headerInfo}>
            <Text style={[styles.schoolNameText, { color: colors.text }]} numberOfLines={1}>
              {schoolName}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const DrawerContent = (props: any) => {
    const menuItems = [
      { name: "Profile", title: "Student Profile", icon: User, path: "/student/Profile" },
      { name: "Fees", title: "Fees", icon: CreditCard, path: "/student/Fees" },
      { name: "Attendance", title: "Attendance", icon: FileSpreadsheet, path: "/student/Attendance" },
      { name: "Timetable", title: "Class Routine", icon: Clock, path: "/student/Timetable" },
      { name: "ExamResult", title: "Exam Result", icon: GraduationCap, path: "/student/ExamResult" },
      { name: "StudyMaterial", title: "Study Material", icon: BookOpen, path: "/student/StudyMaterial" },
      { name: "Syllabus", title: "Syllabus", icon: BookMarked, path: "/student/Syllabus" },
      { name: "Activity", title: "Activity & Notices", icon: Activity, path: "/student/Activity" },
      { name: "Events", title: "Events", icon: Calendar, path: "/student/Events" },
      { name: "Holidays", title: "Holidays", icon: CalendarDays, path: "/student/Holidays" },
      { name: "Transport", title: "Transport", icon: Car, path: "/student/Transport" },
      { name: "Hostel", title: "Hostel", icon: Bed, path: "/student/Hostel" },
      { name: "Medical", title: "Medical", icon: BriefcaseMedical, path: "/student/Medical" },
      { name: "Document", title: "Document", icon: FileText, path: "/student/Document" },
    ];

    const isDashboardActive = pathname === "/" || pathname === "/(main)" || pathname.includes("(tabs)");

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DrawerHeader drawerProps={props} />
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.menuContainer}>
            {/* Dashboard Link */}
            <DrawerItem
              label="Dashboard"
              focused={isDashboardActive}
              activeTintColor={colors.primary}
              inactiveTintColor={colors.textSecondary}
              activeBackgroundColor={colors.primaryLight}
              onPress={() => {
                props.navigation.closeDrawer();
                router.push("/(main)/(tabs)");
              }}
              icon={({ color }) => <Gauge size={iconSize} color={color} />}
              labelStyle={styles.drawerLabel}
              style={styles.drawerItem}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Student Modules</Text>
            
            {menuItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <DrawerItem
                  key={item.name}
                  label={item.title}
                  focused={isActive}
                  activeTintColor={colors.primary}
                  inactiveTintColor={colors.textSecondary}
                  activeBackgroundColor={colors.primaryLight}
                  onPress={() => {
                    props.navigation.closeDrawer();
                    const currentStudentId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
                    router.push({
                      pathname: item.path,
                      params: currentStudentId ? { student_id: String(currentStudentId) } : {},
                    } as any);
                  }}
                  icon={({ color }) => <item.icon size={iconSize} color={color} />}
                  labelStyle={styles.drawerLabel}
                  style={styles.drawerItem}
                />
              );
            })}
          </View>
        </DrawerContentScrollView>
      </View>
    );
  };

  return (
    <Drawer
      screenOptions={{
        drawerStyle: {
          width: windowWidth * 0.8,
          backgroundColor: colors.background,
        },
        drawerActiveBackgroundColor: colors.primaryLight,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "600",
          marginLeft: -10,
        },
        drawerItemStyle: {
          borderRadius: 12,
          marginHorizontal: 12,
          marginVertical: 4,
        },
        headerShown: false,
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Dashboard",
          drawerIcon: ({ color }) => <Gauge size={iconSize} color={color} />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    marginTop: 2,
  },
  schoolNameText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  menuContainer: {
    paddingVertical: 5,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  drawerLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: -10,
  },
  drawerItem: {
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 2,
  },
});
