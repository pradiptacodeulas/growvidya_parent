import SubHeader from "@/components/dashboard/SubHeader";
import { AppDispatch, RootState } from "@/redux/store";
import LottieView from "lottie-react-native";
import { Car, Navigation, RefreshCw, Bus } from "lucide-react-native";
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

const Transport = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);
  const student = dashboardData?.student_details;

  const [transport, setTransport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadTransport = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
      if (!activeId) {
        setLoading(false);
        return;
      }

      const response = await apiFetch(`/parent/child/transport?student_id=${activeId}`, {
        method: "GET",
      });

      if (response.success && response.data) {
        setTransport(response.data);
      } else {
        setTransport(null);
      }
    } catch (e) {
      console.warn("Error fetching transport info:", e);
      setTransport(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.student_id, selectedStudentId, dashboardData, user]);

  useEffect(() => {
    loadTransport();
  }, [loadTransport]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransport(true);
  }, [loadTransport]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Transport" isGradient={true} />
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
        <View style={[styles.studentInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.badgeBg }]}>
            <Car size={22} color={colors.primary} />
          </View>
          <View style={styles.studentDetails}>
            <Text style={[styles.studentName, { color: colors.text }]}>
              {student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() : "Transport Service"}
            </Text>
            <Text style={[styles.studentSub, { color: colors.textMuted }]}>
              Class {student?.class_name || "N/A"} - {student?.section_name || "N/A"} | Roll: {student?.roll_number || "N/A"}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bus Route & Details</Text>
          <View style={[styles.badge, { backgroundColor: transport ? (isDark ? "#064E3B" : "#DCFCE7") : colors.surfaceSubtle }]}>
            <Navigation size={12} color={transport ? (isDark ? "#34D399" : "#15803D") : colors.textMuted} />
            <Text style={[styles.badgeText, { color: transport ? (isDark ? "#34D399" : "#15803D") : colors.textMuted }]}>
              {transport ? "Subscribed" : "Not Subscribed"}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading transport details...</Text>
          </View>
        ) : transport ? (
          <View style={styles.transportDetailsContainer}>
            {/* Route Summary Card */}
            <View style={[styles.mainInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.routeHeader}>
                <View style={[styles.busIconWrapper, { backgroundColor: colors.primaryLight }]}>
                  <Bus size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeName, { color: colors.text }]}>
                    {transport.route_name || transport.transport_route || "-"}
                  </Text>
                  {(transport.route_id || transport.id) ? (
                    <Text style={[styles.routeSub, { color: colors.textMuted }]}>
                      Route ID: #{transport.route_id || transport.id}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.fareTag}>
                  <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Monthly</Text>
                  <Text style={[styles.fareAmount, { color: colors.primary }]}>
                    ₹{parseFloat(transport.fare || transport.monthly_fee || "0").toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={[styles.stopsWrapper, { borderTopColor: colors.border }]}>
                {/* Pickup Point */}
                <View style={styles.stopRow}>
                  <View style={[styles.stopDot, { backgroundColor: "#10B981" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stopLabel, { color: colors.textMuted }]}>PICKUP LOCATION</Text>
                    <Text style={[styles.stopName, { color: colors.text }]}>
                      {transport.pickup_point || "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeConnectorLine} />

                {/* Drop Point */}
                <View style={styles.stopRow}>
                  <View style={[styles.stopDot, { backgroundColor: "#EF4444" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stopLabel, { color: colors.textMuted }]}>DROP-OFF LOCATION</Text>
                    <Text style={[styles.stopName, { color: colors.text }]}>
                      {transport.drop_point || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Vehicle Card */}
            <View style={[styles.vehicleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.cardSectionTitle, { color: colors.text }]}>Vehicle Information</Text>

              <View style={styles.vehicleGrid}>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Vehicle Name</Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>
                    {transport.bus_name || transport.vehicle_name || "N/A"}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Number Plate</Text>
                  <Text style={[styles.gridValue, { color: colors.text, fontWeight: "800" }]}>
                    {transport.number_plate || transport.vehicle_number || "N/A"}
                  </Text>
                </View>

                {transport.seat ? (
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Seat Capacity</Text>
                    <Text style={[styles.gridValue, { color: colors.text }]}>
                      {transport.seat} Seats
                    </Text>
                  </View>
                ) : null}

                {transport.color ? (
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Color</Text>
                    <Text style={[styles.gridValue, { color: colors.text }]}>
                      {transport.color}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          /* Empty State - Genuine un-subscribed */
          <View style={[styles.mainCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <LottieView
              autoPlay
              style={styles.lottie}
              source={require("@/assets/lottiefiles/empty_state.json")}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transport Subscribed</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Bus route details, pickup/drop-off timing, and vehicle details will appear here once subscribed to school transport.
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.refreshBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Transport;

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
  transportDetailsContainer: {
    gap: 14,
    marginBottom: 30,
  },
  mainInfoCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  busIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  routeName: {
    fontSize: 16,
    fontWeight: "800",
  },
  routeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  fareTag: {
    alignItems: "flex-end",
  },
  fareLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: "900",
  },
  stopsWrapper: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 8,
    position: "relative",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeConnectorLine: {
    position: "absolute",
    left: 5,
    top: 32,
    width: 2,
    height: 22,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  stopLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stopName: {
    fontSize: 14,
    fontWeight: "700",
  },
  vehicleCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  gridItem: {
    width: "47%",
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
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
