import ActivityItem from "@/components/dashboard/ActivityItem";
import SubHeader from "@/components/dashboard/SubHeader";
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
import { AppDispatch, RootState } from "@/redux/store";
import { useAppTheme } from "@/theme";
import { apiFetch, resolveStudentId } from "@/services/apiClient";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";
import { Bell, Sparkles } from "lucide-react-native";

const Activity = () => {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string; tab?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);

  const [activeTab, setActiveTab] = useState<"ACTIVITIES" | "NOTICES">(
    params.tab === "NOTICES" ? "NOTICES" : "ACTIVITIES"
  );
  const [activities, setActivities] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.tab === "NOTICES") {
      setActiveTab("NOTICES");
    } else if (params.tab === "ACTIVITIES") {
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
          setNotices(Array.isArray(noticeResponse.data) ? noticeResponse.data : [noticeResponse.data]);
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
                    description={item.activity_description || item.description || item.title || ""}
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
        ) : notices.length > 0 ? (
          <View style={styles.noticesList}>
            {notices.map((item: any, idx: number) => {
              const rawDate = item.notice_date || item.date || item.created_at || "";
              const formattedDate = rawDate
                ? String(rawDate).split("T")[0].split(" ")[0]
                : "";
              const bodyText = item.message || item.description || item.details || "";
              return (
                <View
                  key={item.id ? `${item.id}-${idx}` : idx}
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
                    <Text style={[styles.noticeMessage, { color: colors.textSecondary }]}>
                      {bodyText}
                    </Text>
                  ) : null}
                </View>
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
              School notices and announcements will be shown here.
            </Text>
          </View>
        )}
      </ScrollView>
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
});
