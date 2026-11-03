import Avatar from "@/components/common/Avatar";
import AttendanceChart from "@/components/dashboard/AttendanceChart";
import ExamResult from "@/components/dashboard/ExamResult";
import FeesReminder from "@/components/dashboard/FeesReminder";
import Header from "@/components/dashboard/Header";
import ResultAccordionTable from "@/components/dashboard/ResultAccordionTable";
import SchedulesCard from "@/components/dashboard/SchedulesCard";
import TodaysClass from "@/components/dashboard/TodaysClass";
import ChildCards from "@/components/tabs/ChildCards";
import { setSelectedStudentId } from "@/redux/home/homeSlice";
import { fetchDashboardData, fetchExamResult } from "@/redux/home/homeThunk";
import { AppDispatch, RootState } from "@/redux/store";
import { AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { useAppTheme } from "@/theme";
import { getAvatarUrl, resolveStudentId } from "@/services/apiClient";

const Dashboard: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { colors } = useAppTheme();

  const { user } = useSelector((state: RootState) => state.auth);
  const {
    dashboardData,
    loading,
    error,
    selectedStudentId,
    termResults,
    termLoading,
  } = useSelector((state: RootState) => state.home);

  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const menuItems = [
    {
      id: "1",
      title: "Profile",
      color: "#6366F1",
      icon: "user",
      family: "AntDesign",
    },
    {
      id: "2",
      title: "Fees",
      color: "#10B981",
      icon: "wallet",
      family: "AntDesign",
    },
    {
      id: "3",
      title: "Attendance",
      color: "#F59E0B",
      icon: "calendar",
      family: "AntDesign",
    },
    {
      id: "14",
      title: "Timetable",
      color: "#2563EB",
      icon: "clock-o",
      family: "FontAwesome",
    },
    {
      id: "4",
      title: "Exam Result",
      color: "#3B82F6",
      icon: "book",
      family: "AntDesign",
    },
    {
      id: "5",
      title: "Activity",
      color: "#8B5CF6",
      icon: "tasks",
      family: "FontAwesome",
    },
    {
      id: "6",
      title: "Events",
      color: "#0EA5E9",
      icon: "calendar",
      family: "FontAwesome",
    },
    {
      id: "7",
      title: "Transport",
      color: "#EC4899",
      icon: "car",
      family: "AntDesign",
    },
    {
      id: "8",
      title: "Hostel",
      color: "#06B6D4",
      icon: "home",
      family: "AntDesign",
    },
    {
      id: "9",
      title: "Medical",
      color: "#EF4444",
      icon: "heartbeat",
      family: "FontAwesome",
    },
    {
      id: "10",
      title: "Document",
      color: "#F97316",
      icon: "file-text",
      family: "FontAwesome",
    },
    {
      id: "11",
      title: "Study Material",
      color: "#14B8A6",
      icon: "book",
      family: "FontAwesome",
    },
    {
      id: "12",
      title: "Syllabus",
      color: "#D97706",
      icon: "book",
      family: "FontAwesome",
    },
    {
      id: "13",
      title: "Holidays",
      color: "#E11D48",
      icon: "calendar-check-o",
      family: "FontAwesome",
    },
  ];

  // 1. Initial selection from user state
  useEffect(() => {
    const validStudentId =
      user?.student_id ||
      user?.studentId ||
      user?.activeChild?.id ||
      user?.activeChild?.student_id ||
      user?.children?.[0]?.id ||
      user?.children?.[0]?.student_id;

    if (validStudentId && (!selectedStudentId || String(selectedStudentId) === String(user?.id))) {
      dispatch(setSelectedStudentId(String(validStudentId)));
    }
  }, [user, selectedStudentId, dispatch]);

  // 2. Fetch dashboard data when needed (guarded against error loops)
  useEffect(() => {
    if (user && !dashboardData && !loading && !error) {
      const targetId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
      dispatch(fetchDashboardData(targetId ? String(targetId) : undefined));
    }
  }, [user, selectedStudentId, dashboardData, loading, error, dispatch]);

  // 3. Fallback selection from fetched dashboard response
  useEffect(() => {
    if (dashboardData) {
      const studentId =
        dashboardData.student_details?.student_id ||
        dashboardData.student_details?.id ||
        dashboardData.activeChild?.id ||
        dashboardData.activeChild?.student_id ||
        dashboardData.parent_student?.[0]?.student_id ||
        dashboardData.parent_student?.[0]?.id ||
        dashboardData.children?.[0]?.id;

      if (studentId && (!selectedStudentId || String(selectedStudentId) === String(user?.id))) {
        dispatch(setSelectedStudentId(String(studentId)));
      }
    }
  }, [dashboardData, selectedStudentId, user?.id, dispatch]);

  const handleSelectStudent = (studentId: string) => {
    if (studentId !== String(selectedStudentId)) {
      dispatch(setSelectedStudentId(studentId));
      dispatch(fetchDashboardData(studentId));
    }
  };

  const students = dashboardData?.parent_student || [];
  const selectedStudent = dashboardData?.student_details || {};

  // Mapped Data for Components
  const mappedAttendance = {
    present: dashboardData?.student_attendance_data?.present || 0,
    late: dashboardData?.student_attendance_data?.late || 0,
    halfDay: dashboardData?.student_attendance_data?.half || 0,
    absent: dashboardData?.student_attendance_data?.absent || 0,
  };

  const schedules = (dashboardData?.all_exam_schedule || []).map(
    (exam: any) => {
      const examDate = new Date(exam.date);
      const today = new Date();
      const diffTime = examDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: exam.id,
        term: exam.exam,
        subject: exam.subject_name,
        startTime: exam.start_time,
        endTime: exam.end_time,
        date: exam.date,
        daysLeft: diffDays > 0 ? diffDays : 0,
      };
    },
  );

  const resolveClassStatus = (startTime?: string, endTime?: string): "Completed" | "Ongoing" | "Upcoming" => {
    if (!startTime) return "Upcoming";
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTimeToMinutes = (t: string) => {
        const clean = t.trim().toUpperCase();
        const isPM = clean.includes("PM");
        const isAM = clean.includes("AM");
        const timePart = clean.replace(/[AP]M/, "").trim();
        const [hStr, mStr] = timePart.split(":");
        let h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        return h * 60 + m;
      };

      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = endTime ? parseTimeToMinutes(endTime) : startMinutes + 45;

      if (currentMinutes < startMinutes) return "Upcoming";
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) return "Ongoing";
      return "Completed";
    } catch {
      return "Upcoming";
    }
  };

  const classes = (dashboardData?.today_class || []).map((cls: any) => ({
    id: cls.id,
    subject: cls.subject_name,
    startTime: cls.start_time,
    endTime: cls.end_time,
    status: resolveClassStatus(cls.start_time, cls.end_time),
    avatar: cls.picture ? getAvatarUrl(cls.picture) : undefined,
  }));

  const subjectColors = [
    "#4F46E5",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
  ];
  const currentTermName = dashboardData?.all_exam?.[0]?.exam || "";

  useEffect(() => {
    if (currentTermName && !openTerm) {
      setOpenTerm(currentTermName);
    }
  }, [currentTermName]);

  const mapSubjects = (subjects: any) => {
    return Object.values(subjects || {}).map((s: any, index: number) => ({
      subjectName: s.subject,
      score: s.percentage,
      fullScore: s.full_marks,
      color: subjectColors[index % subjectColors.length],
    }));
  };

  const examResultsSummary: any = {};
  if (dashboardData?.all_exam) {
    dashboardData.all_exam.forEach((termObj: any) => {
      if (
        termObj.exam === currentTermName &&
        dashboardData.exam_result?.subjects
      ) {
        examResultsSummary[termObj.exam] = mapSubjects(
          dashboardData.exam_result.subjects,
        );
      } else if (termResults[termObj.id]?.subjects) {
        examResultsSummary[termObj.exam] = mapSubjects(
          termResults[termObj.id].subjects,
        );
      } else {
        examResultsSummary[termObj.exam] = [];
      }
    });
  }

  const getDetailedResults = (termObj: any) => {
    let termData = null;
    if (
      termObj.exam === currentTermName &&
      dashboardData.exam_result
    ) {
      termData = dashboardData.exam_result;
    } else if (termResults[termObj.id]) {
      termData = termResults[termObj.id];
    }

    if (!termData) return [];

    // If pre-aggregated subjects array
    if (Array.isArray(termData.subjects)) {
      return termData.subjects.map((s: any) => ({
        subject: s.subject_name || s.subject || "",
        practical: s.practical,
        assessment: s.assessment,
        theory: s.theory,
        obtained: s.obtained,
        fullMarks: s.full_marks,
        grade: s.grade_name || s.grade || "-",
      }));
    }

    // If legacy subjects object
    if (termData.subjects && typeof termData.subjects === "object") {
      return Object.values(termData.subjects).map((s: any) => ({
        subject: s.subject || s.subject_name || "",
        practical: s.practical ?? s.Practical ?? null,
        assessment: s.assessment ?? s.Assesment ?? s.Assessment ?? null,
        theory: s.theory ?? s.Theory ?? s.total_marks ?? null,
        obtained: s.obtained ?? s.total_marks ?? null,
        fullMarks: s.full_marks,
        grade: s.grade_name || s.grade || "-",
      }));
    }

    // If raw marks array
    if (Array.isArray(termData.marks)) {
      const subjectMap: Record<string, any> = {};
      termData.marks.forEach((m: any) => {
        const subName = m.subject_name || m.subject || "";
        if (!subjectMap[subName]) {
          subjectMap[subName] = {
            subject: subName,
            practical: null,
            assessment: null,
            theory: null,
            obtained: 0,
            fullMarks: 0,
            grade: m.grade_name || m.grade || "-",
          };
        }
        const val = parseFloat(m.marks || "0") || 0;
        const maxVal = parseFloat(m.max_marks || "0") || 0;
        subjectMap[subName].obtained += val;
        subjectMap[subName].fullMarks += maxVal;

        const typeName = String(m.exam_type_name || "").toLowerCase();
        if (typeName.includes("pract")) subjectMap[subName].practical = val;
        else if (typeName.includes("assess") || typeName.includes("asses")) subjectMap[subName].assessment = val;
        else if (typeName.includes("theor") || typeName.includes("written")) subjectMap[subName].theory = val;
        else if (subjectMap[subName].theory === null) subjectMap[subName].theory = val;

        if (m.grade_name) subjectMap[subName].grade = m.grade_name;
      });
      return Object.values(subjectMap).map((r) => ({
        ...r,
        fullMarks: r.fullMarks > 0 ? r.fullMarks : null,
      }));
    }

    return [];
  };

  const handleToggleAccordion = (termObj: any) => {
    const isOpening = openTerm !== termObj.exam;
    if (isOpening) {
      setOpenTerm(termObj.exam);
      // Fetch if not already fetched and not the default term
      if (
        termObj.exam !== currentTermName &&
        !termResults[termObj.id] &&
        selectedStudentId
      ) {
        dispatch(
          fetchExamResult({ examId: termObj.id, studentId: selectedStudentId }),
        );
      }
    } else {
      setOpenTerm(null);
    }
  };

  const handleGraphTermChange = (termName: string) => {
    const termObj = dashboardData?.all_exam?.find(
      (t: any) => t.exam === termName,
    );
    if (
      termObj &&
      termObj.exam !== currentTermName &&
      !termResults[termObj.id] &&
      selectedStudentId
    ) {
      dispatch(
        fetchExamResult({ examId: termObj.id, studentId: selectedStudentId }),
      );
    }
  };

  const feesSource = (dashboardData?.due_this_month && dashboardData.due_this_month.length > 0)
    ? dashboardData.due_this_month
    : (dashboardData?.student_due_fees || []);

  const fees = feesSource.map((fee: any) => ({
    id: fee.id || Math.random().toString(),
    period: fee.period || fee.title || "",
    fees: `₹${parseFloat(fee.due_amount || fee.fees || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    last_date: fee.last_date || fee.due_date || "N/A",
    invoice_no: fee.invoice_no,
  }));

  const onRefresh = React.useCallback(async () => {
    const targetStudentId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
    setRefreshing(true);
    try {
      await dispatch(fetchDashboardData(targetStudentId ? String(targetStudentId) : undefined)).unwrap();
      
      // If a term is open, re-fetch its results too
      if (openTerm && targetStudentId) {
        const termObj = dashboardData?.all_exam?.find(
          (t: any) => t.exam === openTerm
        );
        if (termObj && termObj.exam !== currentTermName) {
          await dispatch(
            fetchExamResult({ examId: termObj.id, studentId: String(targetStudentId) })
          ).unwrap();
        }
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedStudentId, dashboardData, user, openTerm, currentTermName, dispatch]);

  if (loading && !dashboardData) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  if (error && !dashboardData && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 8, textAlign: "center" }}>
            Unable to Load Dashboard
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 24, paddingHorizontal: 20 }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 14,
            }}
            onPress={() => {
              const targetId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
              dispatch(fetchDashboardData(targetId ? String(targetId) : undefined));
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "900",
            color: colors.text,
            marginBottom: 25,
            letterSpacing: -1,
          }}
        >
          Parent Dashboard
        </Text>

        {/* Student Selector */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 15,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
            Select Student
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {students.map((student: any) => {
              const studentId = String(student.student_id || student.id);
              return (
                <Avatar
                  key={studentId}
                  size={40}
                  source={
                    student.picture
                      ? { uri: getAvatarUrl(student.picture, student.gender) }
                      : null
                  }
                  selected={String(selectedStudentId) === studentId}
                  onPress={() => handleSelectStudent(studentId)}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Student Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            const currentStudentId = resolveStudentId(undefined, selectedStudentId, dashboardData, user);
            router.push({
              pathname: "/student/Profile",
              params: currentStudentId ? { student_id: String(currentStudentId) } : {},
            } as any);
          }}
          style={[styles.studentCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        >
          <View style={{ position: "relative" }}>
            <Avatar
              size={80}
              outline
              source={
                selectedStudent?.picture
                  ? { uri: getAvatarUrl(selectedStudent.picture, selectedStudent.gender) }
                  : null
              }
            />
            <View style={styles.onlineStatus} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={[styles.idBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.idText, { color: colors.primary }]}>
                ID: {selectedStudent?.admission_number || "N/A"}
              </Text>
            </View>
            <Text
              style={[styles.studentName, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedStudent?.first_name || ""} {selectedStudent?.last_name || ""}
            </Text>
            <View style={styles.studentInfoRow}>
              <View style={styles.infoTag}>
                <View style={[styles.infoDot, { backgroundColor: colors.textMuted }]} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Class {selectedStudent?.class_name || "N/A"} -{" "}
                  {selectedStudent?.section_name || "N/A"}
                </Text>
              </View>
              <View style={styles.infoTag}>
                <View style={[styles.infoDot, { backgroundColor: colors.textMuted }]} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Roll: {selectedStudent?.roll_number || "N/A"}
                </Text>
              </View>
            </View>
          </View>
          <AntDesign name="right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Fees Reminder Card (Positioned after Profile Card) */}
        <FeesReminder fees={fees} studentId={selectedStudent?.id || selectedStudent?.student_id || selectedStudentId} />

        {/* Quick Menu Grid */}
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
                    root: "dashboard",
                    ...(currentStudentId ? { student_id: String(currentStudentId) } : {}),
                  },
                } as any);
              }}
            />
          ))}
        </View>

        {/* Data Driven Components */}
        <AttendanceChart data={mappedAttendance} />

        <SchedulesCard exams={schedules} />

        <TodaysClass classes={classes} />

        <ExamResult
          data={examResultsSummary}
          title="Exam Performance"
          onTermChange={handleGraphTermChange}
          isLoading={dashboardData?.all_exam?.some(
            (t: any) => termLoading[t.id],
          )}
        />

        {dashboardData?.all_exam && dashboardData.all_exam.length > 0 && (
          <View style={[styles.tableWrapper, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
              <Text style={[styles.tableTitle, { color: colors.text }]}>Detailed Subject Marks</Text>
            </View>
            {dashboardData.all_exam.map((termObj: any) => (
              <ResultAccordionTable
                key={termObj.id}
                title={termObj.exam}
                data={getDetailedResults(termObj)}
                isExpanded={openTerm === termObj.exam}
                onToggle={() => handleToggleAccordion(termObj)}
                isLoading={termLoading[termObj.id]}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15, backgroundColor: "#fff" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  studentCard: {
    marginBottom: 25,
    padding: 20,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
  },
  onlineStatus: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#4ADE80",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  idBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  idText: { color: "#4F46E5", fontSize: 12, fontWeight: "800" },
  studentName: {
    fontWeight: "600",
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 4,
  },
  studentInfoRow: { flexDirection: "row", gap: 15, alignItems: "center" },
  infoTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  infoText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  tableWrapper: {
    marginTop: 24,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
  },
  tableHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
});
