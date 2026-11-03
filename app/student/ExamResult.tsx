import ResultAccordionTable, { ResultRow } from "@/components/dashboard/ResultAccordionTable";
import SubHeader from "@/components/dashboard/SubHeader";
import { AppDispatch, RootState } from "@/redux/store";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useAppTheme } from "@/theme";
import { apiFetch, resolveStudentId } from "@/services/apiClient";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";
import { Award } from "lucide-react-native";

const ExamResultPage = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);
  const student = dashboardData?.student_details;

  const [examResults, setExamResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  useEffect(() => {
    setExpandedIds({});
  }, [targetStudentId]);

  const loadExamResults = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
      if (!activeId) {
        setLoading(false);
        return;
      }

      const response = await apiFetch(`/parent/child/exam-results?student_id=${activeId}`, {
        method: "GET",
      });

      if (response.success && response.data) {
        const results = Array.isArray(response.data) ? response.data : [response.data];
        setExamResults(results);
        if (results.length > 0) {
          const firstKey = String(results[0].exam_result_id || results[0].id || results[0].exam_name || 0);
          setExpandedIds((prev) => {
            if (Object.keys(prev).length === 0) {
              return { [firstKey]: true };
            }
            return prev;
          });
        }
      } else {
        setExamResults([]);
      }
    } catch (e) {
      console.warn("Failed to fetch exam results:", e);
      setExamResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.student_id, selectedStudentId, dashboardData, user]);

  useEffect(() => {
    loadExamResults();
  }, [loadExamResults]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadExamResults(true);
  }, [loadExamResults]);

  const mapMarksToRows = (marks: any[], subjects?: any[]): ResultRow[] => {
    // If backend returns pre-aggregated subject list with accurate calculations
    if (Array.isArray(subjects) && subjects.length > 0) {
      return subjects.map((sub: any) => ({
        subject: sub.subject_name || "Subject",
        practical: sub.practical ?? null,
        assessment: sub.assessment ?? null,
        theory: sub.theory ?? null,
        obtained: sub.obtained ?? null,
        fullMarks: sub.full_marks ?? 100,
        grade: sub.grade_name || sub.grade || "-",
        marksByType: sub.marks_by_type || {},
      }));
    }

    if (!Array.isArray(marks)) return [];

    const subjectMap: Record<string, ResultRow> = {};

    marks.forEach((m: any) => {
      const subjectName = m.subject_name || m.subject || "Subject";
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          subject: subjectName,
          practical: null,
          assessment: null,
          theory: null,
          obtained: 0,
          fullMarks: 0,
          grade: m.grade_name || m.grade || "-",
          marksByType: {},
        };
      }

      const typeName = String(m.exam_type_name || "").toLowerCase();
      const val = parseFloat(m.marks || "0") || 0;
      const maxVal = parseFloat(m.max_marks || "0") || 0;

      if (subjectMap[subjectName].marksByType) {
        subjectMap[subjectName].marksByType![m.exam_type_name || "Marks"] = val;
      }
      subjectMap[subjectName].obtained = Number(subjectMap[subjectName].obtained || 0) + val;
      subjectMap[subjectName].fullMarks = Number(subjectMap[subjectName].fullMarks || 0) + maxVal;

      // Handle standard and spelling variation patterns
      if (typeName.includes("pract")) {
        subjectMap[subjectName].practical = val;
      } else if (typeName.includes("assess") || typeName.includes("asses")) {
        subjectMap[subjectName].assessment = val;
      } else if (typeName.includes("theor") || typeName.includes("written")) {
        subjectMap[subjectName].theory = val;
      } else {
        if (m.practical !== undefined) subjectMap[subjectName].practical = parseFloat(m.practical);
        else if (m.assessment !== undefined) subjectMap[subjectName].assessment = parseFloat(m.assessment);
        else if (m.theory !== undefined) subjectMap[subjectName].theory = parseFloat(m.theory);
        else {
          if (subjectMap[subjectName].theory === null) {
            subjectMap[subjectName].theory = val;
          }
        }
      }

      if (m.grade_name || m.grade) {
        subjectMap[subjectName].grade = m.grade_name || m.grade;
      }
    });

    return Object.values(subjectMap).map((row) => {
      if (Number(row.fullMarks || 0) <= 0) {
        row.fullMarks = 100;
      }
      return row;
    });
  };

  const handleToggleAccordion = (examKey: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [examKey]: !prev[examKey],
    }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SubHeader title="Exam Result" />
      <ScrollView
        style={[pageStyles.scrollContent, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 32 }}
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
        <View style={[pageStyles.mainCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Student Info Header */}
          <View style={[pageStyles.cardHeader, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
            <Text style={[pageStyles.nameText, { color: colors.text }]} numberOfLines={1}>
              {student ? `${student.first_name} ${student.last_name || ""}`.trim() : "Student Examination Report"}
            </Text>
            <View style={pageStyles.infoRow}>
              <View style={pageStyles.infoItem}>
                <Text style={[pageStyles.label, { color: colors.textSecondary }]}>Roll: </Text>
                <Text style={[pageStyles.value, { color: colors.text }]}>
                  {student?.roll_number || "N/A"}
                </Text>
              </View>

              <View style={[pageStyles.separator, { backgroundColor: colors.border }]} />

              <View style={pageStyles.infoItem}>
                <Text style={[pageStyles.label, { color: colors.textSecondary }]}>Class: </Text>
                <Text style={[pageStyles.value, { color: colors.text }]}>
                  {student?.class_name || "N/A"}
                </Text>
              </View>

              <View style={[pageStyles.separator, { backgroundColor: colors.border }]} />

              <View style={pageStyles.infoItem}>
                <Text style={[pageStyles.label, { color: colors.textSecondary }]}>Section: </Text>
                <Text style={[pageStyles.value, { color: colors.text }]}>
                  {student?.section_name || "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Term Accordion Tables */}
          {loading && !refreshing ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 10, color: colors.textMuted, fontSize: 13 }}>Loading examination results...</Text>
            </View>
          ) : examResults.length > 0 ? (
            examResults.map((examObj: any, index: number) => {
              const examKey = String(examObj.exam_result_id || examObj.id || examObj.exam_name || index);
              const examTitle = `${examObj.exam_name || examObj.exam || "Examination"}${examObj.academic_year ? ` (${examObj.academic_year})` : ""}`;
              const rows = mapMarksToRows(examObj.marks, examObj.subjects);

              const summary = {
                totalObtained: examObj.obtainedMarks ?? rows.reduce((acc, r) => acc + (Number(r.obtained) || 0), 0),
                totalFullMarks: examObj.totalMarks ?? rows.reduce((acc, r) => acc + (Number(r.fullMarks) || 100), 0),
                percentage: examObj.percentage,
                overallGrade: examObj.overallGrade,
              };

              return (
                <ResultAccordionTable
                  key={examKey}
                  title={examTitle}
                  data={rows}
                  summary={summary}
                  percentageBadge={examObj.percentage}
                  overallGrade={examObj.overallGrade}
                  isExpanded={Boolean(expandedIds[examKey])}
                  onToggle={() => handleToggleAccordion(examKey)}
                  isLoading={false}
                />
              );
            })
          ) : (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Award size={36} color={colors.textMuted} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 12 }}>No Exam Results Published</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 4 }}>
                Marks will appear once term examinations and report cards are released by the academic council.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const pageStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 6,
  },
  nameText: {
    fontSize: 20,
    fontWeight: "900",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    width: 1,
    height: 14,
    marginHorizontal: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontWeight: "800",
    fontSize: 13,
  },
});

export default ExamResultPage;
