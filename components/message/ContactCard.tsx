import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { getAvatarUrl } from "@/services/apiClient";

export type contactListType = {
  id: string | number;
  name: string;
  phone?: string;
  image?: any;
  picture?: string | null;
  role?: string;
  lastMessage?: string;
  last_message?: string | null;
  time?: string;
  last_message_time?: string | null;
  unread?: number;
  unread_count?: number;
  is_online?: boolean;
};

const ContactCard = ({ contact }: { contact: contactListType }) => {
  const router = useRouter();
  const { colors } = useAppTheme();

  // Generate initials for avatar placeholder
  const initials = (contact.name || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr.replace(" ", "T"));
      if (isNaN(d.getTime())) return timeStr;
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return timeStr || "";
    }
  };

  const displayPicture = contact.picture || contact.image;
  const avatarUri = displayPicture ? getAvatarUrl(displayPicture) : null;
  const unreadBadge = contact.unread_count || contact.unread || 0;
  const latestMessage = contact.last_message || contact.lastMessage || (contact.role ? `${contact.role.charAt(0).toUpperCase() + contact.role.slice(1)} • Tap to chat` : "Tap to chat");
  const messageTime = formatTime(contact.last_message_time || contact.time);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.cardContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}
      onPress={() =>
        router.push({
          pathname: `/chat/[id]`,
          params: {
            id: String(contact.id),
            role: contact.role || "teacher",
            name: contact.name,
            picture: displayPicture || "",
          },
        } as any)
      }
    >
      <View style={styles.avatarSection}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={[styles.avatar, { backgroundColor: colors.surfaceSubtle }]}
          />
        ) : (
          <View style={[styles.placeholderAvatar, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
            <Text style={[styles.initialsText, { color: colors.primary }]}>{initials}</Text>
          </View>
        )}
        <View
          style={[
            styles.statusDot,
            {
              borderColor: colors.cardBg,
              backgroundColor: contact.is_online ? "#22C55E" : "#94A3B8",
            },
          ]}
        />
      </View>

      <View style={styles.infoSection}>
        <View style={styles.nameRow}>
          <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
            {contact.name}
          </Text>
          {messageTime ? (
            <Text style={[styles.timeText, { color: unreadBadge > 0 ? colors.primary : colors.textMuted }]}>{messageTime}</Text>
          ) : null}
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[
              styles.messageText,
              { color: unreadBadge > 0 ? colors.text : colors.textSecondary },
              unreadBadge > 0 && { fontWeight: "700" },
            ]}
            numberOfLines={1}
          >
            {latestMessage}
          </Text>
          {unreadBadge > 0 ? (
            <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.badgeText}>{unreadBadge > 99 ? "99+" : unreadBadge}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actionSection}>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

export default ContactCard;

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatarSection: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
  },
  placeholderAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  initialsText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  infoSection: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageText: {
    fontSize: 13,
    flex: 1,
    marginRight: 10,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  actionSection: {
    marginLeft: 8,
  },
});
