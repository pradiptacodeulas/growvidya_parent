import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/redux/hooks";
import { useLocalSearchParams } from "expo-router";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { RootState } from "@/redux/store";
import SubHeader from "@/components/dashboard/SubHeader";
import { CheckCircle2, XCircle, Clock, ChevronLeft, Calendar as CalendarIcon } from "lucide-react-native";
import { useAppTheme } from "@/theme";
import { apiFetch } from "@/utils/api";
import { resolveStudentId } from "@/services/apiClient";

type AttendanceStatus = "present" | "absent" | "late" | "halfday" | "holiday";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "#22c55e",
  absent: "#ef4444",
  late: "#0ea5e9",
  halfday: "#8b5cf6",
  holiday: "#3b82f6",
};

const API_STATUS_MAP: Record<string, AttendanceStatus> = {
  "1": "present",
  "0": "absent",
  "2": "late",
  "3": "halfday",
  "4": "holiday",
  "present": "present",
  "absent": "absent",
  "late": "late",
  "half": "halfday",
  "halfday": "halfday",
  "holiday": "holiday",
};

const formatDateFormatted = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function AttendanceImplementation() {
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useAppTheme();

  const user = useSelector((state: RootState) => state.auth.user);
  const selectedStudentId = useSelector((state: RootState) => state.home.selectedStudentId);
  const { dashboardData } = useSelector((state: RootState) => state.home);

  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadAttendance = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
      if (!activeId) {
        setLoading(false);
        return;
      }

      const response = await apiFetch(`/parent/child/attendance?student_id=${activeId}`, {
        method: "GET",
      });

      if (response.success && response.data) {
        const payload = response.data;
        const recordsList = Array.isArray(payload.records) ? payload.records : (Array.isArray(payload) ? payload : []);
        const summary = payload.summary || {};

        const recordsMap: Record<string, string> = {};
        const notesMap: Record<string, string> = {};
        const stats = {
          present: summary.present || 0,
          absent: summary.absent || 0,
          late: summary.late || 0,
          half: summary.halfday || 0,
          holiday: 0,
          percentage: summary.percentage !== undefined ? summary.percentage : 0,
        };

        recordsList.forEach((item: any) => {
          if (item && item.date) {
            const dateStr = item.date.split(" ")[0].split("T")[0]; // "YYYY-MM-DD"
            const attCode = String(item.attendance);
            recordsMap[dateStr] = attCode;
            if (item.notes) {
              notesMap[dateStr] = item.notes;
            }

            if (!payload.summary) {
              if (attCode === "1") stats.present++;
              else if (attCode === "0") stats.absent++;
              else if (attCode === "2") stats.late++;
              else if (attCode === "3") stats.half++;
              else if (attCode === "4") stats.holiday++;
            }
          }
        });

        setAttendanceData({
          student_attendance: recordsMap,
          student_attendance_notes: notesMap,
          student_attendance_data: stats,
          raw_list: recordsList,
        });
      } else {
        setAttendanceData(null);
      }
    } catch (e) {
      console.warn("Failed to fetch attendance API:", e);
      setAttendanceData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.student_id, selectedStudentId, dashboardData, user]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const isValidDateStr = (str?: string): boolean => {
    if (!str || typeof str !== "string") return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());
  };

  const activeData = attendanceData || dashboardData;
  const studentDetails = activeData?.student_details || dashboardData?.student_details;
  const attendanceRecords = activeData?.student_attendance || dashboardData?.student_attendance || {};
  const attendanceNotes = activeData?.student_attendance_notes || {};
  const attendanceStats = activeData?.student_attendance_data || activeData?.attendance_summary || dashboardData?.student_attendance_data || {};

  const TODAY = useMemo(() => new Date().toISOString().split("T")[0], []);
  const rawAdmission = studentDetails?.admission_date?.split(" ")[0]?.split("T")[0];
  const JOINING_DATE = isValidDateStr(rawAdmission) ? rawAdmission : null;

  const [selectedDate, setSelectedDate] = useState<string>(TODAY);
  const [currentMonthStr, setCurrentMonthStr] = useState<string>(TODAY);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

  useEffect(() => {
    if (attendanceRecords && typeof attendanceRecords === "object") {
      const validDateKeys = Object.keys(attendanceRecords)
        .filter((k) => isValidDateStr(k))
        .sort();
      if (validDateKeys.length > 0) {
        const latestDate = validDateKeys[validDateKeys.length - 1];
        if (latestDate) {
          setSelectedDate(latestDate);
          setCurrentMonthStr(latestDate);
        }
      }
    }
  }, [attendanceData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchDashboardData());
    await loadAttendance(true);
  }, [dispatch, loadAttendance]);

  const handleGoToToday = () => {
    setCurrentMonthStr(TODAY);
    setSelectedDate(TODAY);
  };

  // Build markedDates object using react-native-calendars custom markingType
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    // 1. Process API attendance records
    Object.entries(attendanceRecords).forEach(([dateStr, apiStatus]) => {
      const statusKey = String(apiStatus).toLowerCase();
      const status = API_STATUS_MAP[statusKey];
      if (status) {
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === TODAY;
        const bg = STATUS_COLORS[status];

        marks[dateStr] = {
          customStyles: {
            container: {
              backgroundColor: bg,
              borderRadius: 10,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: isSelected ? 2.5 : isToday ? 1.5 : 0,
              borderColor: isSelected ? colors.primary : isToday ? "#FFFFFF" : "transparent",
              elevation: isSelected ? 4 : 0,
              shadowColor: bg,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
            },
            text: {
              color: "#FFFFFF",
              fontWeight: "700",
              fontSize: 13,
            },
          },
        };
      }
    });

    // 2. Selected date fallback (if no attendance record)
    if (selectedDate && !marks[selectedDate]) {
      const isToday = selectedDate === TODAY;
      marks[selectedDate] = {
        customStyles: {
          container: {
            backgroundColor: isToday ? colors.primaryLight : colors.surfaceSubtle,
            borderColor: colors.primary,
            borderWidth: 2,
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
          },
          text: {
            color: colors.primary,
            fontWeight: "800",
            fontSize: 13,
          },
        },
      };
    }

    // 3. Today fallback (if not selected and no record)
    if (TODAY && !marks[TODAY]) {
      marks[TODAY] = {
        customStyles: {
          container: {
            backgroundColor: colors.primaryLight,
            borderColor: colors.primary,
            borderWidth: 1,
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
          },
          text: {
            color: colors.primary,
            fontWeight: "700",
            fontSize: 13,
          },
        },
      };
    }

    return marks;
  }, [attendanceRecords, selectedDate, TODAY, colors]);

  const renderWeeklyList = () => {
    const parts = (selectedDate || TODAY).split("-").map(Number);
    const centerDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    const start = new Date(centerDate);
    start.setDate(centerDate.getDate() - centerDate.getDay());

    return (
      <View style={styles.weeklyList}>
        {Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);

          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const dayNum = String(d.getDate()).padStart(2, "0");
          const dStr = `${year}-${month}-${dayNum}`;

          const rawStatus = attendanceRecords[dStr];
          const recordStatus = rawStatus !== undefined ? API_STATUS_MAP[String(rawStatus).toLowerCase()] : null;
          const isPastThreshold = JOINING_DATE ? dStr < JOINING_DATE : false;
          const isSelected = dStr === selectedDate;

          return (
            <Pressable
              key={i}
              onPress={() => !isPastThreshold && setSelectedDate(dStr)}
              style={[
                styles.weekRow,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: isSelected ? colors.primaryLight : "transparent",
                  borderLeftWidth: 4,
                  borderLeftColor: recordStatus ? STATUS_COLORS[recordStatus] : "transparent",
                },
                isPastThreshold && { opacity: 0.4 },
              ]}
            >
              <View style={styles.weekInfo}>
                <Text style={[styles.weekDayName, { color: colors.text }]}>
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </Text>
                <Text style={[styles.weekDateNum, { color: colors.textMuted }]}>
                  {d.getDate()} {d.toLocaleString("default", { month: "short" })}
                </Text>
              </View>

              <View style={styles.weekStatusContainer}>
                {recordStatus && !isPastThreshold && (
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[recordStatus] }]} />
                )}
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: recordStatus && !isPastThreshold ? STATUS_COLORS[recordStatus] : colors.surfaceSubtle,
                      borderColor: recordStatus && !isPastThreshold ? STATUS_COLORS[recordStatus] : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: recordStatus && !isPastThreshold ? "#FFFFFF" : colors.textMuted, fontWeight: "900" },
                    ]}
                  >
                    {isPastThreshold
                      ? "LOCKED"
                      : recordStatus?.toUpperCase() || "NO DATA"}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const LegendHeader = () => (
    <View style={[styles.legendContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {(Object.keys(STATUS_COLORS) as AttendanceStatus[]).map((status) => (
        <View key={status} style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: STATUS_COLORS[status] }]}>
            <Text style={styles.legendIconText}>
              {status.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      ))}
    </View>
  );

  const getRecordStatusForDate = (dateStr: string) => {
    const rawStatus = attendanceRecords[dateStr];
    if (rawStatus !== undefined) {
      return API_STATUS_MAP[String(rawStatus).toLowerCase()];
    }
    return null;
  };

  if (loading && !dashboardData && !attendanceData) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedStatus = getRecordStatusForDate(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Attendance" isGradient={true} style={styles.heroHeader}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Present</Text>
            <View style={styles.statRow}>
              <CheckCircle2 size={16} color="#FFF" />
              <Text style={styles.summaryValue}>{attendanceStats.present || 0}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Absent</Text>
            <View style={styles.statRow}>
              <XCircle size={16} color="#FFF" />
              <Text style={styles.summaryValue}>{attendanceStats.absent || 0}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Late</Text>
            <View style={styles.statRow}>
              <Clock size={16} color="#FFF" />
              <Text style={styles.summaryValue}>{attendanceStats.late || 0}</Text>
            </View>
          </View>
        </View>
      </SubHeader>

      <View style={[styles.tabWrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.tabContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          {(["month", "week", "day"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setViewMode(m)}
              style={[styles.tab, viewMode === m && [styles.activeTab, { backgroundColor: colors.primary }]]}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, viewMode === m && { color: "#FFF" }]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
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
        <LegendHeader />

        <View style={[styles.mainCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Quick Actions Header */}
          <View style={[styles.quickBar, { borderBottomColor: colors.border }]}>
            <View style={styles.quickBarLeft}>
              <CalendarIcon size={18} color={colors.primary} />
              <Text style={[styles.quickBarTitle, { color: colors.text }]}>Calendar Schedule</Text>
            </View>
            <Pressable
              onPress={handleGoToToday}
              style={[styles.todayBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
            >
              <Text style={[styles.todayBtnText, { color: colors.primary }]}>Jump to Today</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            {viewMode === "month" && (
              <View style={styles.calendarContainer}>
                <Calendar
                  key={`react-native-calendar-${isDark ? "dark" : "light"}`}
                  current={isValidDateStr(currentMonthStr) ? currentMonthStr : TODAY}
                  minDate={JOINING_DATE || undefined}
                  maxDate={isValidDateStr(TODAY) ? TODAY : undefined}
                  enableSwipeMonths={true}
                  onDayPress={(day: DateData) => {
                    if (day && day.dateString) {
                      setSelectedDate(day.dateString);
                    }
                  }}
                  onMonthChange={(month: DateData) => {
                    if (month && month.dateString) {
                      setCurrentMonthStr(month.dateString);
                    }
                  }}
                  markingType={"custom"}
                  markedDates={markedDates}
                  renderArrow={(direction: "left" | "right") => (
                    <View style={[styles.arrowBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <ChevronLeft
                        size={18}
                        color={colors.primary}
                        style={direction === "right" ? { transform: [{ rotate: "180deg" }] } : {}}
                      />
                    </View>
                  )}
                  theme={{
                    calendarBackground: "transparent",
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: "#ffffff",
                    todayTextColor: colors.primary,
                    dayTextColor: colors.text,
                    textDisabledColor: colors.textMuted,
                    monthTextColor: colors.text,
                    indicatorColor: colors.primary,
                    textDayFontWeight: "600",
                    textMonthFontWeight: "800",
                    textDayHeaderFontWeight: "700",
                    textDayFontSize: 14,
                    textMonthFontSize: 17,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </View>
            )}

            {viewMode === "week" && renderWeeklyList()}

            {viewMode === "day" && (
              <View style={styles.dayDetail}>
                <View style={styles.dateHeaderRow}>
                  <Text style={[styles.dayDetailDate, { color: colors.text }]}>
                    {formatDateFormatted(selectedDate)}
                  </Text>
                  {selectedDate === TODAY && (
                    <View style={[styles.todayBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.todayBadgeText, { color: colors.primary }]}>Today</Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.detailCard,
                    {
                      backgroundColor: selectedStatus ? STATUS_COLORS[selectedStatus] + "15" : colors.surfaceSubtle,
                      borderColor: selectedStatus ? STATUS_COLORS[selectedStatus] : colors.border,
                      borderLeftColor: selectedStatus ? STATUS_COLORS[selectedStatus] : colors.border,
                      borderLeftWidth: 6,
                    },
                  ]}
                >
                  <View style={styles.detailCardHeader}>
                    <View style={styles.detailCardLeft}>
                      {selectedStatus === "present" && <CheckCircle2 size={24} color={STATUS_COLORS.present} />}
                      {selectedStatus === "absent" && <XCircle size={24} color={STATUS_COLORS.absent} />}
                      {selectedStatus === "late" && <Clock size={24} color={STATUS_COLORS.late} />}
                      {(!selectedStatus || (selectedStatus !== "present" && selectedStatus !== "absent" && selectedStatus !== "late")) && (
                        <CalendarIcon size={24} color={selectedStatus ? STATUS_COLORS[selectedStatus] : colors.textMuted} />
                      )}
                      <View style={{ marginLeft: 10 }}>
                        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Attendance Status</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: selectedStatus ? STATUS_COLORS[selectedStatus] : colors.text },
                          ]}
                        >
                          {selectedStatus ? selectedStatus.toUpperCase() : "NO RECORD FOUND"}
                        </Text>
                      </View>
                    </View>
                    {selectedStatus && (
                      <View style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[selectedStatus] }]}>
                        <Text style={styles.statusBadgeLargeText}>{selectedStatus.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  {attendanceNotes[selectedDate] ? (
                    <View style={[styles.noteBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                      <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                        Note: {attendanceNotes[selectedDate]}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heroHeader: {
    paddingBottom: 35,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  summaryLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryValue: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  tabWrapper: {
    paddingHorizontal: 20,
    marginTop: -25,
    zIndex: 10,
  },
  tabContainer: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  mainCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  quickBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  quickBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickBarTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    paddingBottom: 10,
  },
  calendarContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  weeklyList: {
    padding: 8,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  weekInfo: {
    gap: 2,
  },
  weekDayName: {
    fontSize: 14,
    fontWeight: "800",
  },
  weekDateNum: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  dayDetail: {
    padding: 20,
  },
  dateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  dayDetailDate: {
    fontSize: 15,
    fontWeight: "800",
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  detailCard: {
    padding: 18,
    borderRadius: 16,
    borderLeftWidth: 6,
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  legendIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  legendIconText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  weekStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailCardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeLargeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  noteBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
