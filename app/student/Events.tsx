import SubHeader from "@/components/dashboard/SubHeader";
import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useAppTheme } from "@/theme";
import { apiFetch } from "@/services/apiClient";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { Calendar, Clock, Sparkles } from "lucide-react-native";

export default function Events() {
  const { colors } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { dashboardData } = useSelector((state: RootState) => state.home);

  const [events, setEvents] = useState<any[]>(dashboardData?.events || []);
  const [loading, setLoading] = useState(!dashboardData?.events?.length);
  const [refreshing, setRefreshing] = useState(false);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(" ")[0];
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr.split(" ")[0];
    }
  };

  const getEventStatus = (fromDateStr?: string, toDateStr?: string) => {
    if (!fromDateStr) return { label: "Event", color: colors.primary, bg: colors.surfaceSubtle };
    const now = new Date();
    const fromDate = new Date(fromDateStr);
    const toDate = toDateStr ? new Date(toDateStr) : fromDate;

    if (now < fromDate) {
      return { label: "Upcoming", color: "#3B82F6", bg: "#EFF6FF" };
    } else if (now >= fromDate && now <= toDate) {
      return { label: "Ongoing", color: "#10B981", bg: "#ECFDF5" };
    } else {
      return { label: "Completed", color: colors.textMuted, bg: colors.surfaceSubtle };
    }
  };

  const loadEvents = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await apiFetch("/parent/child/events", {
        method: "GET",
      });

      if (response.success && Array.isArray(response.data)) {
        setEvents(response.data);
      } else if (dashboardData?.events) {
        setEvents(dashboardData.events);
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.warn("Error fetching events:", e);
      if (dashboardData?.events) {
        setEvents(dashboardData.events);
      } else {
        setEvents([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dashboardData?.events]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadEvents(true),
      dispatch(fetchDashboardData()),
    ]);
    setRefreshing(false);
  }, [loadEvents, dispatch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SubHeader title="School Events" />

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
              Loading events...
            </Text>
          </View>
        ) : events.length > 0 ? (
          <View style={styles.eventsList}>
            {events.map((event: any, idx: number) => {
              const statusInfo = getEventStatus(event.from_date, event.to_date);
              const formattedFrom = formatDate(event.from_date);
              const formattedTo = formatDate(event.to_date);
              const hasDateRange = formattedFrom && formattedTo && formattedFrom !== formattedTo;

              return (
                <View
                  key={event.id || idx}
                  style={[
                    styles.eventCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.dateBadge}>
                      <Calendar size={13} color={colors.primary} />
                      <Text style={[styles.dateText, { color: colors.primary }]}>
                        {hasDateRange ? `${formattedFrom} - ${formattedTo}` : formattedFrom || "Campus Event"}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.eventTitle, { color: colors.text }]}>
                    {event.title}
                  </Text>

                  {event.details ? (
                    <Text style={[styles.eventDetails, { color: colors.textSecondary }]}>
                      {event.details}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Sparkles size={36} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Upcoming Events</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              School functions, sports meets, exhibitions, and annual programs will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
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
  eventsList: {
    gap: 14,
  },
  eventCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    lineHeight: 22,
  },
  eventDetails: {
    fontSize: 13,
    lineHeight: 19,
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
});
