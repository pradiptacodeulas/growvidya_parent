import ActivityItem from "@/components/dashboard/ActivityItem";
import SubHeader from "@/components/dashboard/SubHeader";
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
import { apiFetch, resolveStudentId } from "@/services/apiClient";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, ChevronRight, Megaphone, Search, Sparkles, X } from "lucide-react-native";
import { formatHtmlToReadableText, stripHtmlPreview } from "@/utils/html";

const Activity = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ student_id?: string; tab?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);

  const [activeTab, setActiveTab] = useState<"ACTIVITIES" | "NOTICES">(
    String(params.tab || "").toUpperCase() === "NOTICES" ? "NOTICES" : "ACTIVITIES"
  );
  const [activities, setActivities] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeSearch, setNoticeSearch] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = String(params.tab || "").toUpperCase();
    if (t === "NOTICES") {
      setActiveTab("NOTICES");
    } else if (t === "ACTIVITIES") {
      setActiveTab("ACTIVITIES");
    }
  }, [params.tab]);

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
        if (!activeId) {
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const [actResponse, noticeResponse] = await Promise.all([
          apiFetch(`/parent/child/activities?student_id=${activeId}`, { method: "GET" }),
          apiFetch(`/parent/child/notices?student_id=${activeId}`, { method: "GET" }),
        ]);

        if (actResponse.success && actResponse.data) {
          setActivities(Array.isArray(actResponse.data) ? actResponse.data : [actResponse.data]);
        } else {
          setActivities([]);
        }

        if (noticeResponse.success && noticeResponse.data) {
          const list = Array.isArray(noticeResponse.data)
            ? noticeResponse.data
            : Array.isArray(noticeResponse.data?.notices)
            ? noticeResponse.data.notices
            : [noticeResponse.data];
          setNotices(list);
        } else {
          setNotices([]);
        }
      } catch (e) {
        console.warn("Error fetching activities/notices:", e);
        setActivities([]);
        setNotices([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params.student_id, selectedStudentId, dashboardData, user]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadData(true),
      dispatch(fetchDashboardData(targetStudentId ? String(targetStudentId) : undefined)),
    ]);
    setRefreshing(false);
  }, [loadData, dispatch, targetStudentId]);

  const filteredNotices = useMemo(() => {
    if (!noticeSearch.trim()) return notices;
    const term = noticeSearch.toLowerCase().trim();
    return notices.filter((n) => {
      const titleMatch = String(n.title || "").toLowerCase().includes(term);
      const msgMatch = stripHtmlPreview(
        n.message || n.description || n.details || ""
      )
        .toLowerCase()
        .includes(term);
      return titleMatch || msgMatch;
    });
  }, [notices, noticeSearch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SubHeader title="Activity & Notices" />

      {/* Segmented Filter */}
      <View style={[styles.filterBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("ACTIVITIES")}
          style={[
            styles.tabBtn,
            activeTab === "ACTIVITIES" && [
              styles.activeTabBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ],
          ]}
          activeOpacity={0.7}
        >
          <Sparkles
            size={14}
            color={activeTab === "ACTIVITIES" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === "ACTIVITIES" ? colors.primary : colors.textMuted },
            ]}
          >
            Student Logs ({activities.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("NOTICES")}
          style={[
            styles.tabBtn,
            activeTab === "NOTICES" && [
              styles.activeTabBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ],
          ]}
          activeOpacity={0.7}
        >
          <Bell size={14} color={activeTab === "NOTICES" ? colors.primary : colors.textMuted} />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === "NOTICES" ? colors.primary : colors.textMuted },
            ]}
          >
            School Notices ({notices.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar for Notices */}
      {activeTab === "NOTICES" && (
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Search size={17} color={colors.textMuted} />
            <TextInput
              value={noticeSearch}
              onChangeText={setNoticeSearch}
              placeholder="Search notices..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {noticeSearch.length > 0 && (
              <TouchableOpacity onPress={() => setNoticeSearch("")} hitSlop={8}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView
        style={[styles.scrollContent, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 40 }}
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
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              {activeTab === "ACTIVITIES" ? "Loading activities..." : "Loading notices..."}
            </Text>
          </View>
        ) : activeTab === "ACTIVITIES" ? (
          activities.length > 0 ? (
            <View
              style={[
                styles.cardContainer,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              {activities.map((item: any, index: number) => {
                const rawDate = item.date || item.created_at || "";
                const formattedDate = rawDate
                  ? String(rawDate).split("T")[0].split(" ")[0]
                  : "";
                return (
                  <ActivityItem
                    key={item.id || index}
                    description={stripHtmlPreview(
                      item.activity_description || item.description || item.title || ""
                    )}
                    date={formattedDate}
                    isLast={index === activities.length - 1}
                  />
                );
              })}
            </View>
          ) : (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <Sparkles size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Student Activity Recorded
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Co-curricular accomplishments, sports participation, and classroom milestones
                recorded by teachers will appear here.
              </Text>
            </View>
          )
        ) : filteredNotices.length > 0 ? (
          <View style={styles.noticesList}>
            {filteredNotices.map((item: any, idx: number) => {
              const rawDate = item.publish_on || item.notice_date || item.date || item.created_at || "";
              const formattedDate = rawDate
                ? String(rawDate).split("T")[0].split(" ")[0]
                : "";
              const bodyText = stripHtmlPreview(
                item.message || item.description || item.details || ""
              );
              return (
                <TouchableOpacity
                  key={item.id ? `${item.id}-${idx}` : idx}
                  activeOpacity={0.85}
                  onPress={() => setSelectedNotice(item)}
                  style={[
                    styles.noticeCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  {formattedDate ? (
                    <View style={styles.noticeHeader}>
                      <View style={styles.noticeDateBadge}>
                        <Bell size={12} color={colors.primary} />
                        <Text style={[styles.noticeDateText, { color: colors.primary }]}>
                          {formattedDate}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {item.title ? (
                    <Text style={[styles.noticeTitle, { color: colors.text }]}>{item.title}</Text>
                  ) : null}
                  {bodyText ? (
                    <Text
                      style={[styles.noticeMessage, { color: colors.textSecondary }]}
                      numberOfLines={3}
                    >
                      {bodyText}
                    </Text>
                  ) : null}
                  <View style={[styles.readNoticeRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.readPill, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.readPillText, { color: colors.primary }]}>
                        Read Notice
                      </Text>
                      <ChevronRight size={13} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Bell size={36} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Circulars</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {noticeSearch.trim()
                ? "No notices match your search criteria."
                : "School notices and announcements will be shown here."}
            </Text>
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Megaphone size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                    {selectedNotice?.title || "School Notice"}
                  </Text>
                  <Text style={[styles.modalDate, { color: colors.textMuted }]}>
                    {String(
                      selectedNotice?.publish_on ||
                        selectedNotice?.notice_date ||
                        selectedNotice?.created_at ||
                        ""
                    )
                      .split("T")[0]
                      .split(" ")[0]}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedNotice(null)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSubtle }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingVertical: 16 }}>
              <View
                style={[
                  styles.modalContentBox,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Activity;

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeTabBtn: {
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
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
  scrollContent: {
    padding: 16,
  },
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  emptyContainer: {
    padding: 36,
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  noticesList: {
    gap: 12,
  },
  noticeCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  noticeHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  noticeDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  noticeDateText: {
    fontSize: 12,
    fontWeight: "700",
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  noticeMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  readNoticeRow: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  readPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  readPillText: {
    fontSize: 11.5,
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
    maxHeight: "82%",
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
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: "800",
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
  modalContentBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalContentText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
