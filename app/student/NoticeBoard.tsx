import SubHeader from "@/components/dashboard/SubHeader";
import Avatar from "@/components/common/Avatar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Bell,
  Calendar,
  ChevronRight,
  ExternalLink,
  Megaphone,
  Search,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { apiFetch, getAvatarUrl, getFileUrl, resolveStudentId } from "@/services/apiClient";
import { formatHtmlToReadableText, stripHtmlPreview } from "@/utils/html";
import { useAppTheme } from "@/theme";

const formatNoticeDate = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr).split("T")[0].split(" ")[0];
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr).split("T")[0].split(" ")[0];
  }
};

export default function NoticeBoard() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector(
    (state: RootState) => state.home
  );

  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  const targetStudentId = resolveStudentId(
    params.student_id,
    selectedStudentId,
    dashboardData,
    user
  );

  const student = dashboardData?.student_details || user?.activeChild || null;
  const studentFullName = student
    ? `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
      student.full_name ||
      "Student"
    : "";
  const isStudentActive =
    student ? Number(student.student_status ?? student.status ?? 1) === 1 : true;

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadNotices = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const activeId = resolveStudentId(
          params.student_id,
          selectedStudentId,
          dashboardData,
          user
        );
        const query = activeId ? `?student_id=${activeId}` : "";
        const res = await apiFetch(`/parent/child/notices${query}`, {
          method: "GET",
        });

        if (res.success && res.data) {
          const list = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.notices)
            ? res.data.notices
            : [res.data];
          setNotices(list);
        } else {
          setNotices([]);
        }
      } catch {
        setNotices([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params.student_id, selectedStudentId, dashboardData, user]
  );

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadNotices(true),
      dispatch(
        fetchDashboardData(targetStudentId ? String(targetStudentId) : undefined)
      ),
    ]);
    setRefreshing(false);
  }, [loadNotices, dispatch, targetStudentId]);

  const filteredNotices = useMemo(() => {
    if (!searchTerm.trim()) return notices;
    const term = searchTerm.toLowerCase().trim();
    return notices.filter((n) => {
      const titleMatch = String(n.title || "")
        .toLowerCase()
        .includes(term);
      const bodyMatch = stripHtmlPreview(
        n.message || n.description || n.details || ""
      )
        .toLowerCase()
        .includes(term);
      return titleMatch || bodyMatch;
    });
  }, [notices, searchTerm]);

  const handleOpenAttachment = async (rawPath: string) => {
    const fullUrl = getFileUrl(rawPath);
    if (!fullUrl) return;
    try {
      await WebBrowser.openBrowserAsync(fullUrl);
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Notice Board" isGradient />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
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
        {/* Student Summary Card */}
        {student && (
          <View
            style={[
              styles.studentCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Avatar
              size={50}
              source={
                student.picture
                  ? { uri: getAvatarUrl(student.picture, student.gender) }
                  : null
              }
            />
            <View style={{ flex: 1 }}>
              <View style={styles.studentNameRow}>
                <Text
                  style={[styles.studentName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {studentFullName}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isStudentActive
                        ? "rgba(16,185,129,0.14)"
                        : "rgba(239,68,68,0.14)",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isStudentActive ? "#10B981" : "#EF4444" },
                    ]}
                  />
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: "800",
                      color: isStudentActive ? "#10B981" : "#EF4444",
                    }}
                  >
                    {isStudentActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.studentMeta, { color: colors.textMuted }]}>
                Adm: {student.admission_number || "—"} • Class{" "}
                {student.class_name || "-"}
                {student.section_name ? ` (${student.section_name})` : ""}
              </Text>
            </View>
          </View>
        )}

        {/* Search Input */}
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search notices..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")} hitSlop={8}>
              <X size={17} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Megaphone size={17} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              School Announcements
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.countBadgeText, { color: colors.primary }]}>
              {filteredNotices.length}{" "}
              {filteredNotices.length === 1 ? "Notice" : "Notices"}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading announcements...
            </Text>
          </View>
        ) : filteredNotices.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Bell size={38} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Notices Available
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {searchTerm.trim()
                ? "No notices match your search criteria."
                : "There are currently no active notices or announcements."}
            </Text>
          </View>
        ) : (
          <View style={styles.noticeList}>
            {filteredNotices.map((notice: any, idx: number) => {
              const dateDisplay = formatNoticeDate(
                notice.publish_on || notice.notice_date || notice.created_at
              );
              const rawPreview = stripHtmlPreview(
                notice.message || notice.description || notice.details || ""
              );
              const excerpt =
                rawPreview.length > 150
                  ? `${rawPreview.slice(0, 147)}...`
                  : rawPreview || "Tap to read full notice details.";

              return (
                <TouchableOpacity
                  key={notice.id ? `${notice.id}-${idx}` : idx}
                  activeOpacity={0.85}
                  onPress={() => setSelectedNotice(notice)}
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: colors.border,
                      borderLeftColor: colors.primary,
                    },
                  ]}
                >
                  {!!dateDisplay && (
                    <View style={styles.dateRow}>
                      <Calendar size={12} color={colors.primary} />
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        {dateDisplay}
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.noticeTitle, { color: colors.text }]}>
                    {notice.title || "School Notice"}
                  </Text>

                  <Text
                    style={[styles.noticeExcerpt, { color: colors.textSecondary }]}
                    numberOfLines={3}
                  >
                    {excerpt}
                  </Text>

                  <View
                    style={[
                      styles.cardFooter,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.readBtn,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Text style={[styles.readBtnText, { color: colors.primary }]}>
                        Read Notice
                      </Text>
                      <ChevronRight size={14} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Notice Detail Modal */}
      <Modal
        visible={!!selectedNotice}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNotice(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.cardBg,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconCircle,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Megaphone size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.modalTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {selectedNotice?.title || "School Notice"}
                  </Text>
                  <Text style={[styles.modalDate, { color: colors.textMuted }]}>
                    {formatNoticeDate(
                      selectedNotice?.publish_on ||
                        selectedNotice?.notice_date ||
                        selectedNotice?.created_at
                    )}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedNotice(null)}
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyInner}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.modalContentBox,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.modalContentText, { color: colors.text }]}>
                  {formatHtmlToReadableText(
                    selectedNotice?.message ||
                      selectedNotice?.description ||
                      selectedNotice?.details
                  ) || "No details provided."}
                </Text>
              </View>

              {!!(
                selectedNotice?.attachment ||
                selectedNotice?.attachments ||
                selectedNotice?.file_path
              ) && (
                <TouchableOpacity
                  style={[
                    styles.attachmentBtn,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    handleOpenAttachment(
                      selectedNotice.attachment ||
                        selectedNotice.attachments ||
                        selectedNotice.file_path
                    )
                  }
                >
                  <ExternalLink size={16} color={colors.primary} />
                  <Text style={[styles.attachmentBtnText, { color: colors.primary }]}>
                    View Notice Attachment
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSelectedNotice(null)}
                style={[styles.closeFooterBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.closeFooterBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  studentName: {
    fontSize: 15.5,
    fontWeight: "800",
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  studentMeta: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyCard: {
    padding: 36,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  noticeList: {
    gap: 12,
  },
  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  noticeTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 21,
  },
  noticeExcerpt: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  readBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  readBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "84%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  modalDate: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: "600",
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 18,
  },
  modalBodyInner: {
    paddingVertical: 16,
    gap: 12,
  },
  modalContentBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalContentText: {
    fontSize: 14,
    lineHeight: 22,
  },
  attachmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  attachmentBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  closeFooterBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeFooterBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
