import SubHeader from "@/components/dashboard/SubHeader";
import { AppDispatch, RootState } from "@/redux/store";
import LottieView from "lottie-react-native";
import { BriefcaseMedical, Heart, Calendar, AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react-native";
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

const Medical = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);
  const student = dashboardData?.student_details;

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadMedical = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
      if (!activeId) {
        setLoading(false);
        return;
      }

      const response = await apiFetch(`/parent/child/medical?student_id=${activeId}`, {
        method: "GET",
      });

      if (response.success && response.data) {
        setRecords(Array.isArray(response.data) ? response.data : [response.data]);
      } else {
        setRecords([]);
      }
    } catch (e) {
      console.warn("Error fetching medical records:", e);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.student_id, selectedStudentId, dashboardData, user]);

  useEffect(() => {
    loadMedical();
  }, [loadMedical]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMedical(true);
  }, [loadMedical]);

  const studentFullName = student
    ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
    : "";
  const bloodGroup = student?.blood_group_name || student?.blood_group || "";
  const rollNumber = student?.roll_number || "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Medical Records" isGradient={true} />
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
        {student && (studentFullName || bloodGroup || rollNumber) ? (
          <View style={[styles.studentInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.badgeBg }]}>
              <BriefcaseMedical size={22} color={colors.primary} />
            </View>
            <View style={styles.studentDetails}>
              {studentFullName ? (
                <Text style={[styles.studentName, { color: colors.text }]}>
                  {studentFullName}
                </Text>
              ) : null}
              {(bloodGroup || rollNumber) ? (
                <Text style={[styles.studentSub, { color: colors.textMuted }]}>
                  {bloodGroup ? (
                    <>
                      Blood Group: <Text style={{ color: "#EF4444", fontWeight: "800" }}>{bloodGroup}</Text>
                    </>
                  ) : null}
                  {bloodGroup && rollNumber ? " | " : null}
                  {rollNumber ? `Roll: ${rollNumber}` : null}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Health & Checkup Logs</Text>
          <View style={[styles.badge, { backgroundColor: colors.surfaceSubtle }]}>
            <Heart size={12} color="#EF4444" />
            <Text style={[styles.badgeText, { color: "#EF4444" }]}>
              {records.length} {records.length === 1 ? "Record" : "Records"}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading health records...</Text>
          </View>
        ) : records.length > 0 ? (
          <View style={styles.recordsList}>
            {records.map((rec) => {
              const conditionLabel = rec.condition_name || "";
              const dateLabel =
                rec.formatted_medical_date ||
                (rec.medical_time ? String(rec.medical_time).split(" ")[0] : "");
              const condNum = Number(rec.medical_condition);
              const statusColor =
                condNum === 1 || String(conditionLabel).toLowerCase() === "good"
                  ? "#10B981"
                  : condNum === 2 || String(conditionLabel).toLowerCase() === "bad"
                  ? "#EF4444"
                  : "#F59E0B";
              const descriptionText = rec.description || "";

              return (
                <View
                  key={rec.id}
                  style={[styles.recordCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                >
                  {(dateLabel || conditionLabel) ? (
                    <View style={styles.recordHeader}>
                      {dateLabel ? (
                        <View style={styles.recordMeta}>
                          <Calendar size={14} color={colors.textMuted} />
                          <Text style={[styles.recordDate, { color: colors.textSecondary }]}>
                            {dateLabel}
                          </Text>
                        </View>
                      ) : <View />}
                      {conditionLabel ? (
                        <View style={[styles.statusPill, { backgroundColor: statusColor + "18" }]}>
                          <Text style={[styles.statusPillText, { color: statusColor }]}>
                            {conditionLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {descriptionText ? (
                    <Text style={[styles.recordDescription, { color: colors.text }]}>
                      {descriptionText}
                    </Text>
                  ) : null}

                  {rec.informed_status ? (
                    <View style={styles.recordFooter}>
                      <View style={styles.informedStatus}>
                        {Number(rec.is_informed) === 1 ? (
                          <>
                            <CheckCircle2 size={13} color="#10B981" />
                            <Text style={[styles.informedText, { color: "#10B981" }]}>
                              {rec.informed_status}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Clock size={13} color={colors.textMuted} />
                            <Text style={[styles.informedText, { color: colors.textMuted }]}>
                              {rec.informed_status}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          /* Real Empty State - When genuine no records exist */
          <View style={[styles.mainCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <LottieView
              autoPlay
              style={styles.lottie}
              source={require("@/assets/lottiefiles/empty_state.json")}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Medical Incidents</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Annual health checkups, vaccination records, and infirmary visits recorded by the campus health clinic will appear here.
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.refreshBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Refresh Records</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Medical;

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
  recordsList: {
    gap: 12,
    marginBottom: 30,
  },
  recordCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recordMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  illnessTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  recordDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  informedStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  informedText: {
    fontSize: 12,
    fontWeight: "600",
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
