import SubHeader from "@/components/dashboard/SubHeader";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  GraduationCap,
  RefreshCw,
  Search,
  X,
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
  TextInput,
  Modal,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useAppTheme } from "@/theme";
import { resolveStudentId } from "@/services/apiClient";
import { fetchDashboardData, fetchChildSyllabus } from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";

type StatusFilterType = "all" | "1" | "2" | "3";

const STATUS_FILTERS: { key: StatusFilterType; label: string }[] = [
  { key: "all", label: "All Status" },
  { key: "1", label: "Pending" },
  { key: "2", label: "Progress" },
  { key: "3", label: "Complete" },
];

const Syllabus = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  const {
    dashboardData,
    selectedStudentId,
    syllabus,
    syllabusLoading,
  } = useSelector((state: RootState) => state.home);

  const student = dashboardData?.student_details;
  const studentClassName = student?.class_name || student?.class || "-";

  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

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

  const loadSyllabus = useCallback(async () => {
    const activeId = resolveStudentId(
      params.student_id,
      selectedStudentId,
      dashboardData,
      user
    );
    if (!activeId) return;

    await dispatch(fetchChildSyllabus(activeId));
  }, [params.student_id, selectedStudentId, dashboardData, user, dispatch]);

  useEffect(() => {
    loadSyllabus();
  }, [loadSyllabus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSyllabus();
    setRefreshing(false);
  }, [loadSyllabus]);

  const subjectList = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(syllabus)) {
      syllabus.forEach((item: any) => {
        if (item?.subject_name) {
          const key = String(item.subject_id || item.subject_name);
          map.set(key, item.subject_name);
        }
      });
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [syllabus]);

  const filteredSyllabus = useMemo(() => {
    if (!Array.isArray(syllabus)) return [];
    return syllabus.filter((item: any) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const subject = (item.subject_name || "").toLowerCase();
        const lesson = (item.lession || item.lesson || "").toLowerCase();
        const year = (item.academic_year_name || item.academic_year_code || "").toLowerCase();
        if (!subject.includes(q) && !lesson.includes(q) && !year.includes(q)) {
          return false;
        }
      }

      if (selectedSubject !== "all") {
        const matchId = String(item.subject_id) === String(selectedSubject);
        const matchName =
          String(item.subject_name || "").toLowerCase() === String(selectedSubject).toLowerCase();
        if (!matchId && !matchName) {
          return false;
        }
      }

      if (selectedStatus !== "all") {
        if (String(item.status) !== String(selectedStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [syllabus, searchQuery, selectedSubject, selectedStatus]);

  const getStatusMeta = (status?: number | string) => {
    const s = Number(status);
    if (s === 3) {
      return {
        label: "Complete",
        color: "#10B981",
        bg: isDark ? "#064E3B" : "#ECFDF5",
        Icon: CheckCircle2,
      };
    }
    if (s === 2) {
      return {
        label: "Progress",
        color: "#0284C7",
        bg: isDark ? "#0C4A6E" : "#E0F2FE",
        Icon: RefreshCw,
      };
    }
    return {
      label: "Pending",
      color: "#EF4444",
      bg: isDark ? "#7F1D1D" : "#FEE2E2",
      Icon: Clock,
    };
  };

  const hasActiveFilters =
    selectedSubject !== "all" || selectedStatus !== "all" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSelectedSubject("all");
    setSelectedStatus("all");
    setSearchQuery("");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Class Syllabus" />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search subject, lesson..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Subject Filter Chips */}
      {subjectList.length > 0 && (
        <View style={styles.subjectFilterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedSubject === "all" ? colors.primary : colors.surfaceSubtle,
                  borderColor: selectedSubject === "all" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedSubject("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedSubject === "all" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                All Subjects
              </Text>
            </TouchableOpacity>

            {subjectList.map((subj) => {
              const isActive = selectedSubject === subj.id;
              return (
                <TouchableOpacity
                  key={subj.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceSubtle,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSubject(subj.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isActive ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    {subj.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Status Filter Row */}
      <View style={styles.statusFilterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {STATUS_FILTERS.map((st) => {
            const isActive = selectedStatus === st.key;
            return (
              <TouchableOpacity
                key={st.key}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isActive ? colors.primaryLight : "transparent",
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedStatus(st.key)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.clearFilterBtn, { borderColor: "#EF4444" }]}
              onPress={clearFilters}
            >
              <X size={13} color="#EF4444" />
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Main Content */}
      <ScrollView
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
        {syllabusLoading && !refreshing && (!syllabus || syllabus.length === 0) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading syllabus...
            </Text>
          </View>
        ) : filteredSyllabus.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <BookOpen size={44} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Syllabus Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No syllabus records are available for the selected filters.
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={[styles.resetBtn, { backgroundColor: colors.primary }]}
                onPress={clearFilters}
              >
                <Text style={styles.resetBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredSyllabus.map((item: any, idx: number) => {
            const statusMeta = getStatusMeta(item.status);
            const StatusIcon = statusMeta.Icon;
            const lessonText = item.lession || item.lesson || "-";
            const academicYear =
              item.academic_year_name || item.academic_year_code || "-";

            return (
              <TouchableOpacity
                key={item.id || idx}
                style={[
                  styles.card,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
                onPress={() => setSelectedItem(item)}
                activeOpacity={0.8}
              >
                {/* Top Row: Subject Badge & Status */}
                <View style={styles.cardTop}>
                  <View style={[styles.subjectBadge, { backgroundColor: colors.primaryLight }]}>
                    <BookOpen size={13} color={colors.primary} />
                    <Text style={[styles.subjectBadgeText, { color: colors.primary }]}>
                      {item.subject_name || "-"}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                    <StatusIcon size={13} color={statusMeta.color} />
                    <Text style={[styles.statusText, { color: statusMeta.color }]}>
                      {statusMeta.label}
                    </Text>
                  </View>
                </View>

                {/* Lesson / Syllabus Topics Preview */}
                <Text style={[styles.lessonLabel, { color: colors.textMuted }]}>
                  Lesson / Syllabus Topics
                </Text>
                <Text
                  style={[styles.lessonPreview, { color: colors.text }]}
                  numberOfLines={3}
                >
                  {lessonText}
                </Text>

                {/* Footer: Class + Academic Year + View button */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.metaGroup}>
                    <View style={styles.metaItem}>
                      <GraduationCap size={13} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {item.class_name || studentClassName}
                      </Text>
                    </View>
                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                    <View style={styles.metaItem}>
                      <Calendar size={13} color={colors.textMuted} />
                      <Text
                        style={[styles.metaText, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {academicYear}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.viewAction}>
                    <Eye size={14} color={colors.primary} />
                    <Text style={[styles.viewActionText, { color: colors.primary }]}>View</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* View Lesson Modal */}
      {selectedItem && (
        <Modal
          visible={!!selectedItem}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedItem.subject_name || "Syllabus Details"}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    Class: {selectedItem.class_name || studentClassName}
                    {selectedItem.academic_year_name || selectedItem.academic_year_code
                      ? ` • ${selectedItem.academic_year_name || selectedItem.academic_year_code}`
                      : ""}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedItem(null)}>
                  <X size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalStatusRow}>
                <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                  Lesson / Topics
                </Text>
                {(() => {
                  const st = getStatusMeta(selectedItem.status);
                  const StIcon = st.Icon;
                  return (
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <StIcon size={13} color={st.color} />
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  );
                })()}
              </View>

              <ScrollView
                style={[
                  styles.modalTopicBox,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                contentContainerStyle={{ padding: 14 }}
              >
                <Text style={[styles.modalTopicText, { color: colors.text }]}>
                  {selectedItem.lession || selectedItem.lesson || "No lesson details provided."}
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default Syllabus;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  subjectFilterWrapper: {
    paddingTop: 4,
  },
  statusFilterRow: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 3,
  },
  clearFilterText: {
    color: "#EF4444",
    fontSize: 11.5,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    maxWidth: "68%",
  },
  subjectBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  lessonLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  lessonPreview: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  metaGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaDot: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
  },
  viewAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  modalStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalSectionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  modalTopicBox: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 340,
    marginBottom: 16,
  },
  modalTopicText: {
    fontSize: 14,
    lineHeight: 22,
  },
  closeModalBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
