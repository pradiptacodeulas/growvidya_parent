import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useAppTheme } from '@/theme';

export interface ClassData {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  status: 'Completed' | 'Upcoming' | 'Ongoing';
  avatar?: string; // URL for the teacher/subject image
}

interface TodaysClassProps {
  classes: ClassData[];
}

const TodaysClass: React.FC<TodaysClassProps> = ({ classes }) => {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header with Full-Width Line */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Today's Class</Text>
      </View>

      <View style={styles.bodyContent}>
        {classes.length > 0 ? (
          <View>
            {classes.map((item) => (
            <View key={item.id} style={[styles.classCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              {/* Avatar / Placeholder */}
              <View style={styles.avatarContainer}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.badgeBg }]}>
                    <Text style={[styles.placeholderChar, { color: colors.primary }]}>{item.subject.charAt(0)}</Text>
                  </View>
                )}
              </View>

              {/* Class Details */}
              <View style={styles.detailsContainer}>
                <Text style={[styles.subjectText, { color: colors.text }]}>{item.subject}</Text>
                <View style={styles.timeRow}>
                  <Clock size={14} color={colors.textMuted} />
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.startTime} - {item.endTime}</Text>
                </View>
              </View>

              {/* Status Badge */}
              <View style={[
                styles.statusBadge,
                item.status === 'Completed' ? { backgroundColor: isDark ? "#064E3B" : "#DCFCE7" } : { backgroundColor: colors.surface }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: item.status === 'Completed' ? '#22c55e' : colors.textMuted }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: item.status === 'Completed' ? (isDark ? "#34D399" : "#15803D") : colors.textSecondary }
                ]}>
                  {item.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
        ) : (
          <View style={{ paddingVertical: 14, alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600" }}>
              No scheduled classes for today
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1, // Thin bar under header
    borderBottomColor: "#f1f5f9",
  },
  title: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1e293b" 
  },
  bodyContent: {
    padding: 20,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderChar: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  detailsContainer: {
    flex: 1,
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  statusSuccess: {
    backgroundColor: '#f0fdf4',
  },
  statusNeutral: {
    backgroundColor: '#f8fafc',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default TodaysClass;