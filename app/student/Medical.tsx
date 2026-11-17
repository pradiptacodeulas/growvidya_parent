import SubHeader from "@/components/dashboard/SubHeader";
import { AppDispatch, RootState } from "@/redux/store";
import LottieView from "lottie-react-native";
import {
  BriefcaseMedical,
  Heart,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Droplet,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
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

const formatShortDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      return String(dateStr).split("T")[0].split(" ")[0];
    }
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr).split("T")[0].split(" ")[0];
  }
};

const Medical = () => {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector(
    (state: RootState) => state.home
  );

  const [records, setRecords] = useState<any[]>([]);
  const [childDetails, setChildDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const targetStudentId = resolveStudentId(
    params.student_id,
    selectedStudentId,
    dashboardData,
    user
  );

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadMedical = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const activeId = resolveStudentId(
          params.student_id,
          selectedStudentId,
          dashboardData,
          user
        );
        if (!activeId) {
          setLoading(false);
          return;
        }

        const [medRes, profRes] = await Promise.all([
          apiFetch(`/parent/child/medical?student_id=${activeId}`, {
            method: "GET",
          }),
          apiFetch(`/parent/child/profile?student_id=${activeId}`, {
            method: "GET",
          }).catch(() => null),
        ]);

        if (medRes.success && medRes.data) {
          setRecords(
            Array.isArray(medRes.data) ? medRes.data : [medRes.data]
          );
        } else {
          setRecords([]);
        }

        if (profRes && profRes.success && profRes.data) {
          setChildDetails(profRes.data);
        }
      } catch (e) {
        console.warn("Error fetching medical records:", e);
        setRecords([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params.student_id, selectedStudentId, dashboardData, user]
  );

  useEffect(() => {
    loadMedical();
  }, [loadMedical]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMedical(true);
  }, [loadMedical]);

  const student = childDetails || dashboardData?.student_details;
  const studentFullName = student
    ? `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
      student.full_name ||
      ""
    : "";
  const bloodGroup =
    childDetails?.blood_group_name ||
    childDetails?.blood_group ||
    student?.blood_group_name ||
    student?.blood_group ||
    "—";
  const rollNumber = student?.roll_number || "";

  const requiresAttention = useMemo(
    () =>
      records.some((m) => {
        const condNum = Number(m.medical_condition);
        const name = String(m.condition_name || m.condition || "").toLowerCase();
        return (
          condNum === 2 ||
          name.includes("bad") ||
          name.includes("ill") ||
          name.includes("attention")
        );
      }),
    [records]
  );

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
        {student && (studentFullName || rollNumber) ? (
          <View
            style={[
              styles.studentInfoCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.badgeBg }]}>
              <BriefcaseMedical size={22} color={colors.primary} />
            </View>
            <View style={styles.studentDetails}>
              {studentFullName ? (
                <Text style={[styles.studentName, { color: colors.text }]}>
                  {studentFullName}
                </Text>
              ) : null}
              <Text style={[styles.studentSub, { color: colors.textMuted }]}>
                Class {student?.class_name || "-"}
                {student?.section_name ? ` (${student.section_name})` : ""}
                {rollNumber ? ` • Roll: ${rollNumber}` : ""}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Summary Health Cards matching ParentMedical.jsx */}
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.summaryIconBox,
                { backgroundColor: "rgba(239, 68, 68, 0.12)" },
              ]}
            >
              <Droplet size={17} color="#EF4444" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Blood Group
            </Text>
            <Text style={[styles.summaryVal, { color: "#EF4444" }]}>
              {bloodGroup}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.summaryIconBox,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Heart size={17} color={colors.primary} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Records
            </Text>
            <Text style={[styles.summaryVal, { color: colors.primary }]}>
              {records.length} Logged
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.summaryIconBox,
                {
                  backgroundColor: requiresAttention
                    ? "rgba(245, 158, 11, 0.14)"
                    : "rgba(16, 185, 129, 0.14)",
                },
              ]}
            >
              <ShieldCheck
                size={17}
                color={requiresAttention ? "#D97706" : "#10B981"}
              />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Health Status
            </Text>
            <Text
              style={[
                styles.summaryVal,
                {
                  color: requiresAttention ? "#D97706" : "#10B981",
                  fontSize: 12,
                },
              ]}
              numberOfLines={1}
            >
              {requiresAttention ? "Under Observation" : "Fit & Healthy"}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Health & Checkup Logs
          </Text>
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
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading health records...
            </Text>
          </View>
        ) : records.length > 0 ? (
          <View style={styles.recordsList}>
            {records.map((rec, idx) => {
              const condNum = Number(rec.medical_condition);
              const rawCondName = String(
                rec.condition_name || rec.condition || ""
              );
              const conditionLabel =
                rawCondName ||
                (condNum === 1
                  ? "Good (Fit)"
                  : condNum === 2
                  ? "Requires Attention"
                  : "Other");
              const dateLabel =
                rec.formatted_medical_date ||
                formatShortDate(rec.medical_time || rec.created_at);
              const recordedOnLabel = formatShortDate(rec.created_at);

              const statusColor =
                condNum === 1 ||
                rawCondName.toLowerCase().includes("good") ||
                rawCondName.toLowerCase().includes("fit")
                  ? "#10B981"
                  : condNum === 2 ||
                    rawCondName.toLowerCase().includes("bad") ||
                    rawCondName.toLowerCase().includes("ill")
                  ? "#EF4444"
                  : "#F59E0B";

              const descriptionText =
                rec.description || rec.notes || rec.remarks || "";

              const informedLabel =
                rec.informed_status ||
                (Number(rec.is_informed) === 1
                  ? "Parent Informed"
                  : "School Record");

              return (
                <View
                  key={rec.id || idx}
                  style={[
                    styles.recordCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.recordHeader}>
                    {dateLabel ? (
                      <View style={styles.recordMeta}>
                        <Calendar size={14} color={colors.textMuted} />
                        <Text
                          style={[
                            styles.recordDate,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {dateLabel}
                        </Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusColor + "18" },
                      ]}
                    >
                      <Text
                        style={[styles.statusPillText, { color: statusColor }]}
                      >
                        {conditionLabel}
                      </Text>
                    </View>
                  </View>

                  {descriptionText ? (
                    <Text
                      style={[styles.recordDescription, { color: colors.text }]}
                    >
                      {descriptionText}
                    </Text>
                  ) : null}

                  <View
                    style={[
                      styles.recordFooter,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <View style={styles.informedStatus}>
                      {Number(rec.is_informed) === 1 ? (
                        <>
                          <CheckCircle2 size={13} color="#10B981" />
                          <Text
                            style={[styles.informedText, { color: "#10B981" }]}
                          >
                            {informedLabel}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Clock size={13} color={colors.textMuted} />
                          <Text
                            style={[
                              styles.informedText,
                              { color: colors.textMuted },
                            ]}
                          >
                            {informedLabel}
                          </Text>
                        </>
                      )}
                    </View>

                    {!!recordedOnLabel && (
                      <Text
                        style={[styles.recordedOnText, { color: colors.textMuted }]}
                      >
                        Recorded: {recordedOnLabel}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <LottieView
              autoPlay
              style={styles.lottie}
              source={require("@/assets/lottiefiles/empty_state.json")}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Medical Incidents
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              Annual health checkups, vaccination records, and infirmary visits
              recorded by the campus health clinic will appear here.
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={[
                styles.refreshBtn,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
                Refresh Records
              </Text>
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
    marginBottom: 14,
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
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 13.5,
    fontWeight: "800",
    textAlign: "center",
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
  recordDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  recordFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
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
  recordedOnText: {
    fontSize: 11,
    fontWeight: "500",
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
