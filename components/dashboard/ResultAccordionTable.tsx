import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  ActivityIndicator,
} from "react-native";
import { useAppTheme } from "@/theme";

// Enable LayoutAnimation for Android (only needed on legacy architecture)
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !(global as any).nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Configuration for table column widths
const COLS = {
  subject: 130,
  component: 86,
  total: 86,
  fullMarks: 80,
  grade: 70,
};

export interface ResultRow {
  subject: string;
  practical?: number | string | null;
  assessment?: number | string | null;
  theory?: number | string | null;
  obtained?: number | string | null;
  fullMarks?: number | string | null;
  grade?: string;
  marksByType?: Record<string, number | string | null>;
}

export interface TableSummary {
  totalObtained: number | string;
  totalFullMarks: number | string;
  percentage?: number | string;
  overallGrade?: string;
}

interface Props {
  title: string;
  data: ResultRow[];
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isLoading?: boolean;
  columns?: string[];
  summary?: TableSummary | null;
  percentageBadge?: number | string;
  overallGrade?: string;
}

const ResultAccordionTable = ({
  title,
  data = [],
  defaultExpanded = true,
  isExpanded: controlledExpanded,
  onToggle,
  isLoading = false,
  columns: customColumns,
  summary,
  percentageBadge,
  overallGrade,
}: Props) => {
  const { colors } = useAppTheme();
  const [internalExpanded, setInternalExpanded] = React.useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const animation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const toggle = () => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (e) {
      // fallback silently
    }
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const chevronRotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Check if data has breakdown components
  const hasPractical = data.some(
    (r) => r.practical !== undefined && r.practical !== null && r.practical !== ""
  );
  const hasAssessment = data.some(
    (r) => r.assessment !== undefined && r.assessment !== null && r.assessment !== ""
  );
  const hasTheory = data.some(
    (r) => r.theory !== undefined && r.theory !== null && r.theory !== ""
  );

  // If ANY component is present, show the full breakdown columns: Practical, Assessment, Theory, Total, Grade
  const hasBreakdown = hasPractical || hasAssessment || hasTheory;

  let columns: string[] = [];
  if (customColumns && customColumns.length > 0) {
    columns = customColumns;
  } else if (hasBreakdown) {
    columns = ["Subject", "Practical", "Assessment", "Theory", "Total", "Grade"];
  } else {
    columns = ["Subject", "Marks", "Max", "Grade"];
  }

  // Calculate local summary if not provided
  const computedSummary: TableSummary = summary || (() => {
    let totObtained = 0;
    let totFull = 0;
    data.forEach((r) => {
      const ob = parseFloat(String(r.obtained ?? r.theory ?? 0)) || 0;
      const fm = parseFloat(String(r.fullMarks ?? 100)) || 100;
      totObtained += ob;
      totFull += fm;
    });
    const pct = totFull > 0 ? Math.round((totObtained / totFull) * 100) : 0;
    return {
      totalObtained: totObtained,
      totalFullMarks: totFull,
      percentage: pct,
      overallGrade: overallGrade,
    };
  })();

  const formatCellValue = (val: any) => {
    if (val === undefined || val === null || val === "" || val === "null") return "—";
    const num = Number(val);
    if (!isNaN(num)) return String(num);
    return String(val);
  };

  const TableContent = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={compStyles.horizontalScroll}>
      <View style={[compStyles.table, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {/* Table Header Row */}
        <View
          style={[
            compStyles.tableRow,
            compStyles.headerRow,
            { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border },
          ]}
        >
          {columns.map((label, i) => {
            const isLast = i === columns.length - 1;
            let colWidth = COLS.component;
            if (label === "Subject") colWidth = COLS.subject;
            else if (label === "Assessment") colWidth = 92;
            else if (label === "Grade") colWidth = COLS.grade;
            else if (label === "Total" || label === "Marks") colWidth = COLS.total;
            else if (label === "Max") colWidth = COLS.fullMarks;

            return (
              <View
                key={label}
                style={[
                  compStyles.headerCell,
                  { width: colWidth, borderRightColor: colors.border },
                  isLast && { borderRightWidth: 0 },
                ]}
              >
                <Text style={[compStyles.headerLabel, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            );
          })}
        </View>

        {isLoading ? (
          <View style={compStyles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[compStyles.loadingText, { color: colors.textSecondary }]}>Loading marks...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={compStyles.emptyRow}>
            <Text style={[compStyles.emptyText, { color: colors.textMuted }]}>No marks recorded</Text>
          </View>
        ) : (
          <>
            {/* Subject Rows */}
            {data.map((item, index) => {
              const rowObtained =
                item.obtained !== undefined && item.obtained !== null
                  ? item.obtained
                  : item.theory !== undefined && item.theory !== null
                  ? item.theory
                  : "—";

              const isEven = index % 2 === 0;

              return (
                <View
                  key={`${item.subject}-${index}`}
                  style={[
                    compStyles.tableRow,
                    {
                      backgroundColor: isEven ? colors.cardBg : colors.surfaceSubtle,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  {columns.map((colName, cIdx) => {
                    const isLast = cIdx === columns.length - 1;
                    let colWidth = COLS.component;
                    if (colName === "Subject") colWidth = COLS.subject;
                    else if (colName === "Assessment") colWidth = 92;
                    else if (colName === "Grade") colWidth = COLS.grade;
                    else if (colName === "Total" || colName === "Marks") colWidth = COLS.total;
                    else if (colName === "Max") colWidth = COLS.fullMarks;

                    let cellValue: any = "—";
                    let isBold = false;
                    let isSubject = false;
                    let isGrade = false;

                    if (colName === "Subject") {
                      cellValue = item.subject;
                      isSubject = true;
                    } else if (colName === "Practical") {
                      cellValue = formatCellValue(item.practical);
                    } else if (colName === "Assessment") {
                      cellValue = formatCellValue(item.assessment);
                    } else if (colName === "Theory") {
                      cellValue = formatCellValue(item.theory);
                    } else if (colName === "Total" || colName === "Marks") {
                      const ob = formatCellValue(rowObtained);
                      const max = item.fullMarks ? ` / ${item.fullMarks}` : "";
                      cellValue = ob !== "—" ? `${ob}${max}` : "—";
                      isBold = true;
                    } else if (colName === "Max") {
                      cellValue = formatCellValue(item.fullMarks || 100);
                    } else if (colName === "Grade") {
                      cellValue = item.grade || "—";
                      isGrade = true;
                    }

                    return (
                      <View
                        key={`${colName}-${cIdx}`}
                        style={[
                          compStyles.cell,
                          { width: colWidth, borderRightColor: colors.border },
                          isLast && { borderRightWidth: 0 },
                        ]}
                      >
                        {isGrade ? (
                          <View
                            style={[
                              compStyles.gradeBadge,
                              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[compStyles.gradeText, { color: colors.primary }]}>
                              {cellValue}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              isSubject
                                ? [compStyles.subjectText, { color: colors.text }]
                                : isBold
                                ? [compStyles.boldCellText, { color: colors.text }]
                                : [compStyles.cellText, { color: colors.textSecondary }],
                            ]}
                            numberOfLines={isSubject ? 2 : 1}
                          >
                            {cellValue}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Summary Footer Row */}
            {data.length > 0 && (
              <View
                style={[
                  compStyles.tableRow,
                  compStyles.footerRow,
                  { backgroundColor: colors.surfaceSubtle, borderTopColor: colors.border },
                ]}
              >
                {columns.map((colName, cIdx) => {
                  const isLast = cIdx === columns.length - 1;
                  let colWidth = COLS.component;
                  if (colName === "Subject") colWidth = COLS.subject;
                  else if (colName === "Assessment") colWidth = 92;
                  else if (colName === "Grade") colWidth = COLS.grade;
                  else if (colName === "Total" || colName === "Marks") colWidth = COLS.total;
                  else if (colName === "Max") colWidth = COLS.fullMarks;

                  return (
                    <View
                      key={`footer-${colName}`}
                      style={[
                        compStyles.cell,
                        compStyles.footerCell,
                        { width: colWidth, borderRightColor: colors.border },
                        isLast && { borderRightWidth: 0 },
                      ]}
                    >
                      {colName === "Subject" ? (
                        <Text style={[compStyles.footerTitle, { color: colors.text }]}>GRAND TOTAL</Text>
                      ) : colName === "Total" || colName === "Marks" ? (
                        <Text style={[compStyles.footerTotal, { color: colors.primary }]}>
                          {computedSummary.totalObtained} / {computedSummary.totalFullMarks}
                        </Text>
                      ) : colName === "Max" ? (
                        <Text style={[compStyles.footerTotal, { color: colors.textSecondary }]}>
                          {computedSummary.totalFullMarks}
                        </Text>
                      ) : colName === "Grade" ? (
                        <View style={[compStyles.gradeBadge, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[compStyles.gradeText, { color: colors.primary }]}>
                            {computedSummary.overallGrade || (computedSummary.percentage ? `${computedSummary.percentage}%` : "—")}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[compStyles.cellText, { color: colors.textMuted }]}>—</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );

  const displayPct = percentageBadge !== undefined && percentageBadge !== null ? percentageBadge : computedSummary.percentage;
  const displayGrade = overallGrade || computedSummary.overallGrade;

  return (
    <View style={[compStyles.accordionWrapper, { borderTopColor: colors.border }]}>
      <TouchableOpacity
        style={[compStyles.accordionHeader, { backgroundColor: colors.cardBg }]}
        onPress={toggle}
        activeOpacity={0.75}
      >
        <View style={compStyles.titleRow}>
          <View style={[compStyles.checkCircle, { backgroundColor: colors.primaryLight }]}>
            <Text style={[compStyles.checkMark, { color: colors.primary }]}>✓</Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[compStyles.accordionTitle, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <View style={compStyles.rightHeaderArea}>
          {displayPct !== undefined && displayPct !== null && (
            <View style={[compStyles.scorePill, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[compStyles.scorePillText, { color: colors.textSecondary }]}>
                {computedSummary.totalObtained}/{computedSummary.totalFullMarks}
              </Text>
              <View style={[compStyles.pctBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[compStyles.pctBadgeText, { color: colors.primary }]}>
                  {displayPct}%
                </Text>
              </View>
            </View>
          )}

          {displayGrade && displayGrade !== "-" && (
            <View style={[compStyles.headerGradeBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[compStyles.headerGradeText, { color: colors.primary }]}>{displayGrade}</Text>
            </View>
          )}

          {isLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />}

          <Animated.Text
            style={[
              compStyles.chevron,
              { color: colors.textMuted, transform: [{ rotate: chevronRotate }] },
            ]}
          >
            ▼
          </Animated.Text>
        </View>
      </TouchableOpacity>

      {/* Directly render the breakdown table when expanded to avoid any 0-height clipping */}
      {isExpanded && (
        <View style={compStyles.tableContainer}>
          <TableContent />
        </View>
      )}
    </View>
  );
};

const compStyles = StyleSheet.create({
  accordionWrapper: {
    borderTopWidth: 1,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  rightHeaderArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkMark: {
    fontSize: 12,
    fontWeight: "800",
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 3,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pctBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  headerGradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headerGradeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  chevron: {
    fontSize: 11,
    marginLeft: 4,
  },
  tableContainer: {
    width: "100%",
  },
  horizontalScroll: {
    width: "100%",
  },
  table: {
    minWidth: "100%",
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  footerRow: {
    borderTopWidth: 2,
    borderBottomWidth: 0,
  },
  headerCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerCell: {
    paddingVertical: 12,
  },
  subjectText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "left",
    alignSelf: "flex-start",
    paddingLeft: 4,
  },
  cellText: {
    fontSize: 13,
    textAlign: "center",
  },
  boldCellText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "left",
    alignSelf: "flex-start",
    paddingLeft: 4,
  },
  footerTotal: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  gradeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyRow: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  loadingRow: {
    padding: 24,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ResultAccordionTable;
