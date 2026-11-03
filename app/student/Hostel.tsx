import SubHeader from "@/components/dashboard/SubHeader";
import { AppDispatch, RootState } from "@/redux/store";
import LottieView from "lottie-react-native";
import { Bed, Info, Home, DoorOpen, IndianRupee, RefreshCw } from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useAppTheme } from "@/theme";
import { apiFetch, resolveStudentId } from "@/services/apiClient";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";

const Hostel = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);
  const student = dashboardData?.student_details;

  const [hostel, setHostel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadHostel = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
      if (!activeId) {
        setLoading(false);
        return;
      }

      const response = await apiFetch(`/parent/child/hostel?student_id=${activeId}`, {
        method: "GET",
      });

      if (response.success && response.data) {
        setHostel(response.data);
      } else {
        setHostel(null);
      }
    } catch (e) {
      console.warn("Error fetching hostel info:", e);
      setHostel(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.student_id, selectedStudentId, dashboardData, user]);

  useEffect(() => {
    loadHostel();
  }, [loadHostel]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHostel(true);
  }, [loadHostel]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Hostel Details" isGradient={true} />
      <ScrollView
        style={styles.scrollContent}
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
        {/* Student Info Summary */}
        <View style={[styles.studentInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.badgeBg }]}>
            <Bed size={22} color={colors.primary} />
          </View>
          <View style={styles.studentDetails}>
            <Text style={[styles.studentName, { color: colors.text }]}>
              {student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() : "Hostel Allocation"}
            </Text>
            <Text style={[styles.studentSub, { color: colors.textMuted }]}>
              Class {student?.class_name || "N/A"} - {student?.section_name || "N/A"} | Admission: {student?.admission_number || "N/A"}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hostel Accommodation</Text>
          <View style={[styles.badge, { backgroundColor: hostel ? (isDark ? "#064E3B" : "#DCFCE7") : colors.surfaceSubtle }]}>
            <Info size={12} color={hostel ? (isDark ? "#34D399" : "#15803D") : colors.textMuted} />
            <Text style={[styles.badgeText, { color: hostel ? (isDark ? "#34D399" : "#15803D") : colors.textMuted }]}>
              {hostel ? "Allocated" : "Not Allocated"}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading hostel information...</Text>
          </View>
        ) : hostel ? (
          <View style={styles.hostelContainer}>
            {/* Main Hostel Info Card */}
            <View style={[styles.mainInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.hostelHeader}>
                <View style={[styles.homeIconWrapper, { backgroundColor: colors.primaryLight }]}>
                  <Home size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hostelName, { color: colors.text }]}>
                    {hostel.hostel_name || "-"}
                  </Text>
                  {hostel.id ? (
                    <Text style={[styles.hostelSub, { color: colors.textMuted }]}>
                      Allocation #{hostel.id} • Active
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.detailGrid}>
                {/* Room Number */}
                <View style={[styles.detailTile, { backgroundColor: colors.surfaceSubtle }]}>
                  <DoorOpen size={20} color={colors.primary} />
                  <View style={{ marginTop: 6 }}>
                    <Text style={[styles.tileLabel, { color: colors.textMuted }]}>ROOM NUMBER</Text>
                    <Text style={[styles.tileValue, { color: colors.text }]}>
                      {hostel.room_number || "N/A"}
                    </Text>
                  </View>
                </View>

                {/* Hostel Fee */}
                <View style={[styles.detailTile, { backgroundColor: colors.surfaceSubtle }]}>
                  <IndianRupee size={20} color="#10B981" />
                  <View style={{ marginTop: 6 }}>
                    <Text style={[styles.tileLabel, { color: colors.textMuted }]}>HOSTEL FEE</Text>
                    <Text style={[styles.tileValue, { color: colors.text }]}>
                      ₹{parseFloat(hostel.hostel_fee || "0").toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Empty State - Genuine not allocated */
          <View style={[styles.mainCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <LottieView
              autoPlay
              style={styles.lottie}
              source={require("@/assets/lottiefiles/empty_state.json")}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Hostel Allocated</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Hostel block, room assignment, and fee details will appear here once registered for campus accommodation.
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.refreshBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Hostel;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  studentInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "800",
  },
  studentSub: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  hostelContainer: {
    gap: 14,
    marginBottom: 30,
  },
  mainInfoCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  hostelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  homeIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  hostelName: {
    fontSize: 18,
    fontWeight: "800",
  },
  hostelSub: {
    fontSize: 12,
    marginTop: 3,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 12,
  },
  detailTile: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tileValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 30,
  },
  lottie: {
    width: 180,
    height: 180,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
