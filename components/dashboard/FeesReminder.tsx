import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform } from "react-native";
import { CheckCircle2, CreditCard, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/theme";

export interface FeeItem {
  id: string;
  period: string;
  fees: string;
  last_date: string;
  invoice_no?: string;
}

interface FeesReminderProps {
  fees?: FeeItem[];
  studentId?: string | number;
}

const FeesReminder: React.FC<FeesReminderProps> = ({ fees = [], studentId }) => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const handleNavigateToFees = () => {
    router.push({
      pathname: "/student/Fees",
      params: {
        root: "dashboard",
        ...(studentId ? { student_id: String(studentId) } : {}),
      },
    } as any);
  };

  const renderItem = (item: FeeItem, isLast: boolean) => (
    <View
      key={item.id}
      style={[
        styles.feeItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7" }]}>
          <CreditCard size={20} color="#D97706" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.feeTitle, { color: colors.text }]} numberOfLines={1}>
            {item.period || "Monthly School Fee"}
          </Text>
          <View style={styles.subInfoRow}>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              Due: <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>{item.last_date}</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightContent}>
        <Text style={styles.feeAmountText}>{item.fees}</Text>
        <TouchableOpacity
          style={[styles.payNowBtn, { backgroundColor: colors.primary }]}
          onPress={handleNavigateToFees}
          activeOpacity={0.8}
        >
          <Text style={styles.payNowText}>Pay Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Sparkles size={16} color={fees.length > 0 ? "#F59E0B" : "#10B981"} style={{ marginRight: 6 }} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {fees.length > 0 ? "Pending Fees & Dues" : "Fee Status"}
          </Text>
        </View>

        <TouchableOpacity onPress={handleNavigateToFees} activeOpacity={0.7}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>
            {fees.length > 0 ? "View All" : "View History"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {fees.length > 0 ? (
        <View style={styles.listContent}>
          {fees.slice(0, 3).map((item, index) => renderItem(item, index === Math.min(fees.length, 3) - 1))}
        </View>
      ) : (
        <View style={styles.clearedBannerWrapper}>
          <View
            style={[
              styles.clearedBanner,
              { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5", borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0" },
            ]}
          >
            <View style={styles.clearedIconCircle}>
              <CheckCircle2 size={32} color="#10B981" />
            </View>
            <View style={styles.clearedTextCol}>
              <Text style={styles.clearedTitleText}>All Dues Cleared!</Text>
              <Text style={[styles.clearedSubText, { color: colors.textSecondary }]}>
                No pending fee invoices for this student.
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default FeesReminder;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "800",
  },
  listContent: {
    paddingVertical: 4,
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
  },
  rightContent: {
    alignItems: "flex-end",
    gap: 4,
  },
  feeAmountText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#EF4444",
  },
  payNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  payNowText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* All Dues Cleared Banner */
  clearedBannerWrapper: {
    padding: 16,
  },
  clearedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearedIconCircle: {
    marginRight: 14,
  },
  clearedTextCol: {
    flex: 1,
  },
  clearedTitleText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#059669",
    marginBottom: 2,
  },
  clearedSubText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
