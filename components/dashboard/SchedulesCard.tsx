import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';

interface Exam {
  id: string;
  term: string;
  subject: string;
  startTime: string;
  endTime: string;
  date: string;
  daysLeft: number;
}

interface SchedulesCardProps {
  exams: Exam[];
}

const SchedulesCard: React.FC<SchedulesCardProps> = ({ exams }) => {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Schedules</Text>
      </View>

      <View style={styles.bodyContent}>
        {/* Exams List */}
        <View style={styles.examsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Exams</Text>
          {exams.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.examsScrollContent}
            >
              {exams.map((exam) => (
                <View key={exam.id} style={[styles.examCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.termText, { color: colors.primary }]}>{exam.term}</Text>
                    <View style={styles.daysBadge}>
                      <Feather name="clock" size={10} color="#ef4444" />
                      <Text style={styles.daysText}>{exam.daysLeft} Days More</Text>
                    </View>
                  </View>

                  <Text style={[styles.subjectText, { color: colors.text }]} numberOfLines={1}>{exam.subject}</Text>

                  <View style={styles.footerRow}>
                    <View style={styles.footerIconGroup}>
                      <Feather name="clock" size={14} color={colors.textMuted} />
                      <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>{exam.startTime}</Text>
                    </View>
                    <View style={styles.footerIconGroup}>
                      <MaterialCommunityIcons name="calendar-check-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>{exam.date}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                No upcoming exams scheduled
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9', 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1e293b' 
  },
  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  addBtnText: { 
    color: '#4f46e5', 
    fontWeight: '600', 
    fontSize: 13 
  },
  bodyContent: {
    paddingVertical: 16,
  },
  examsSection: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  examsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 240,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  termText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysText: { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  subjectText: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerIconGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerInfo: { fontSize: 12, color: '#64748b', fontWeight: '500' },
});

export default SchedulesCard;