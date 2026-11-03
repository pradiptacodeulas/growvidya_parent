import { Calendar } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { useAppTheme } from "@/theme";

interface AttendanceData {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
}

interface AttendanceChartProps {
  data: AttendanceData;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data }) => {
  const { colors } = useAppTheme();

  const chartData = [
    { value: data.present, color: "#10B981", text: "Present" },
    { value: data.late, color: "#3B82F6", text: "Late" },
    { value: data.halfDay, color: "#F59E0B", text: "Half Day" },
    { value: data.absent, color: "#EF4444", text: "Absent" },
  ].filter((item) => item.value > 0);

  const finalChartData =
    chartData.length > 0 ? chartData : [{ value: 1, color: colors.border }];

  const statItems = [
    { label: "Present", count: data.present },
    { label: "Late", count: data.late },
    { label: "Half Day", count: data.halfDay },
    { label: "Absent", count: data.absent },
  ];

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header with Full-Width Line */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Attendance Summary</Text>
        <Calendar size={18} color={colors.primary} />
      </View>

      {/* Body content with internal padding */}
      <View style={styles.bodyContent}>
        {/* Stats Grid */}
        <View style={[styles.statsGrid, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          {statItems.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.statBox,
                index !== statItems.length - 1 && [styles.borderRight, { borderRightColor: colors.border }],
              ]}
            >
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{item.label}</Text>
              <Text style={[styles.statCount, { color: colors.text }]}>{item.count}</Text>
            </View>
          ))}
        </View>

        {/* Pie Chart Section */}
        <View style={styles.chartContainer}>
          <PieChart
            data={finalChartData}
            donut
            radius={80}
            innerRadius={60}
            innerCircleColor={colors.cardBg}
            centerLabelComponent={() => (
              <View style={{ justifyContent: "center", alignItems: "center" }}>
                <Text
                  style={{ fontSize: 22, fontWeight: "bold", color: colors.text }}
                >
                  {data.present + data.late + data.halfDay + data.absent}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Total</Text>
              </View>
            )}
          />
        </View>

        {/* Footer Section - Legend */}
        <View style={[styles.footerSection, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <View style={styles.legendRow}>
            <LegendItem color="#10B981" label="Present" textColor={colors.textSecondary} />
            <LegendItem color="#3B82F6" label="Late" textColor={colors.textSecondary} />
            <LegendItem color="#F59E0B" label="Half Day" textColor={colors.textSecondary} />
            <LegendItem color="#EF4444" label="Absent" textColor={colors.textSecondary} />
          </View>
        </View>
      </View>
    </View>
  );
};

const LegendItem: React.FC<{ color: string; label: string; textColor?: string }> = ({
  color,
  label,
  textColor,
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={[styles.legendText, textColor ? { color: textColor } : null]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  bodyContent: {
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  statsGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 5,
    marginBottom: 28,
  },
  statBox: { flex: 1, paddingVertical: 14, alignItems: "center" },
  borderRight: { borderRightWidth: 1, borderRightColor: "#f1f5f9" },
  statLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  statCount: { fontSize: 18, fontWeight: "800", color: "#334155" },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    marginBottom: 20,
  },
  footerSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 5,
    padding: 18,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: "600", color: "#475569" },
});

export default AttendanceChart;
