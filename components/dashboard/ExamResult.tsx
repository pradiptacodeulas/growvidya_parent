import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle, ActivityIndicator } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useAppTheme } from "@/theme";

export interface SubjectResult {
  subjectName: string;
  score: number;
  fullScore: number;
  color: string;
}

export interface ExamData {
  [termName: string]: SubjectResult[];
}

interface ReusableExamResultProps {
  data: ExamData;
  title?: string;
  onTermChange?: (termName: string) => void;
  isLoading?: boolean;
}

interface ChartDataItem {
  value: number;
  label: string;
  frontColor: string;
  topLabelComponent: () => React.ReactNode;
  labelComponent: () => React.ReactNode;
}

const ExamResult: React.FC<ReusableExamResultProps> = ({
  data = {},
  title = "Exam Performance",
  onTermChange,
  isLoading = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const terms = Object.keys(data);
  const [selectedTerm, setSelectedTerm] = useState<string>("");

  useEffect(() => {
    if (terms.length > 0) {
      if (!selectedTerm || !terms.includes(selectedTerm)) {
        const firstTerm = terms[0];
        setSelectedTerm(firstTerm);
        if (onTermChange) {
          onTermChange(firstTerm);
        }
      }
    }
  }, [terms]);

  const handleTermSelect = (value: string) => {
    setSelectedTerm(value);
    if (onTermChange) {
      onTermChange(value);
    }
  };

  const currentSubjects = selectedTerm ? data[selectedTerm] || [] : [];

  // Transform raw subject data into BarChart format
  const chartData: ChartDataItem[] = currentSubjects.map((s) => ({
    value: Number(s.score) || 0,
    labelComponent: () => (
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Text style={[styles.xAxisLabel, { color: colors.textSecondary }]} numberOfLines={1}>
          {s.subjectName ? (s.subjectName.length > 5 ? s.subjectName.substring(0, 3) + "." : s.subjectName) : "Sub"}
        </Text>
        <Text style={[styles.fullMarksText, { color: colors.textMuted }]}>({s.fullScore})</Text>
      </View>
    ),
    label: "",
    frontColor: s.color || colors.primary,
    topLabelComponent: () => (
      <Text style={[styles.topLabelText, { color: colors.text }]}>{s.score}%</Text>
    ),
  }));

  if (terms.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header with Term Selection */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
          {terms.length > 1 && (
            <Menu onSelect={handleTermSelect}>
              <MenuTrigger style={[styles.trigger, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.triggerText, { color: colors.textSecondary }]}>{selectedTerm} ▼</Text>
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    padding: 5,
                    borderRadius: 10,
                    width: 140,
                    backgroundColor: colors.cardBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    elevation: 5,
                  },
                }}
              >
                {terms.map((term) => (
                  <MenuOption key={term} value={term}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, padding: 6 }}>
                      {term}
                    </Text>
                  </MenuOption>
                ))}
              </MenuOptions>
            </Menu>
          )}
          {terms.length === 1 && (
            <View style={[styles.trigger, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.triggerText, { color: colors.textSecondary }]}>{selectedTerm}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Subject Badges */}
      <View style={styles.badgeContainer}>
        {currentSubjects.map((item, index) => (
          <View
            key={`${selectedTerm}-${item.subjectName}-${index}`}
            style={[
              styles.badge,
              { backgroundColor: isDark ? "rgba(79, 70, 229, 0.2)" : `${item.color || colors.primary}15` },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: item.color || colors.primary }]}
            >
              {item.subjectName}: {Math.round((item.score * item.fullScore) / 100)}
            </Text>
          </View>
        ))}
      </View>

      {/* Bar Chart or Empty State */}
      <View style={styles.chartWrapper}>
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : currentSubjects.length > 0 ? (
          <BarChart
            key={`${selectedTerm}-${currentSubjects.length}`}
            data={chartData}
            barWidth={22}
            spacing={25}
            noOfSections={5}
            maxValue={100}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.border}
            yAxisTextStyle={[styles.yAxisText, { color: colors.textMuted }]}
            stepValue={20}
            isAnimated
            animationDuration={500}
            hideRules
            yAxisLabelTexts={['0%', '20%', '40%', '60%', '80%', '100%']}
            xAxisLabelTextStyle={[styles.xAxisLabel, { color: colors.textSecondary }]}
            xAxisLabelsVerticalShift={20}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No performance data found</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingBottom: 28,
    marginTop: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "800" },
  trigger: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  triggerText: { fontSize: 13, fontWeight: "600" },
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
    paddingHorizontal: 20,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  chartWrapper: {
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 20,
    paddingRight: 30,
    minHeight: 220,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  yAxisText: { fontSize: 10, fontWeight: "600" },
  xAxisLabel: { fontSize: 10, fontWeight: "800" },
  fullMarksText: { fontSize: 9, fontWeight: "600" },
  topLabelText: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
    width: 40,
  },
});

export default ExamResult;
