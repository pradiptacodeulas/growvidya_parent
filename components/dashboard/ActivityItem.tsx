import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme";

interface ActivityItemProps {
  description: string;
  date: string;
  isLast: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  description,
  date,
  isLast,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.itemContainer, { borderBottomColor: colors.border }, isLast && styles.noBorder]}>
      <Text style={[styles.descriptionText, { color: colors.text }]}>{description}</Text>
      <Text style={[styles.dateText, { color: colors.textMuted }]}>{date}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
  },
  itemContainer: {
    flexDirection: "row",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  descriptionText: {
    flex: 3,
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
    fontWeight: "500",
    marginRight: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 12,
    color: "#80868B",
    textAlign: "right",
  },
});

export default ActivityItem;
