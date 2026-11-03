import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  View,
  Text,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Search, MessageSquareOff, MessageSquare, RefreshCw, Mail } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchUnreadCount } from "@/redux/features/chat/slice";
import { connectSocket } from "@/services/socket.service";
import Contactcard, { contactListType } from "@/components/message/ContactCard";
import Header from "@/components/dashboard/Header";
import { useAppTheme } from "@/theme";
import { apiFetch } from "@/services/apiClient";

const ROW_HEIGHT = 86;

const Message = () => {
  const { colors, isDark } = useAppTheme();
  const TAB_BAR_HEIGHT = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<contactListType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<"ALL" | "UNREAD">("ALL");

  const loadContacts = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await apiFetch("/messages/contacts", {
        method: "GET",
      });

      if (response.success && response.data) {
        const rawList = Array.isArray(response.data) ? response.data : [];
        const seen = new Set<string>();
        const uniqueContacts: contactListType[] = [];
        for (const item of rawList) {
          const key = `${(item.role || "teacher").toLowerCase()}_${item.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueContacts.push(item);
          }
        }
        setContacts(uniqueContacts);
      } else {
        setContacts([]);
      }
    } catch (e) {
      console.warn("Failed to load message contacts:", e);
      setContacts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts(true);
      dispatch(fetchUnreadCount());
    }, [loadContacts, dispatch])
  );

  useEffect(() => {
    loadContacts();
    dispatch(fetchUnreadCount());
  }, [loadContacts, dispatch]);

  // Real-time socket event handlers
  useEffect(() => {
    let activeSocket: any = null;
    let cleanupListeners: (() => void) | null = null;

    const setupSocket = async () => {
      activeSocket = await connectSocket();
      if (!activeSocket) return;

      const handleReceive = (newMsg: any) => {
        const senderId = Number(newMsg.sender);
        const senderRole = (newMsg.sender_role || "teacher").toLowerCase();

        setContacts((prev) => {
          const idx = prev.findIndex(
            (c) => Number(c.id) === senderId && (c.role || "teacher").toLowerCase() === senderRole
          );
          if (idx >= 0) {
            const copy = [...prev];
            const found = copy[idx];
            const updated = {
              ...found,
              last_message: newMsg.message || (newMsg.file ? "Sent an attachment" : ""),
              last_message_time: newMsg.time || new Date().toISOString(),
              unread_count: (found.unread_count || found.unread || 0) + 1,
            };
            copy.splice(idx, 1);
            return [updated, ...copy];
          } else {
            loadContacts(true);
            return prev;
          }
        });

        dispatch(fetchUnreadCount());
      };

      const handleOnlineList = (onlineKeys: string[]) => {
        if (!Array.isArray(onlineKeys)) return;
        setContacts((prev) =>
          prev.map((c) => {
            const role = (c.role || "teacher").toLowerCase();
            const key = `${role}_${c.id}`;
            const isOnline = onlineKeys.includes(key);
            return { ...c, is_online: isOnline };
          })
        );
      };

      const handleUserOnline = (data: any) => {
        if (!data?.userId) return;
        const uid = Number(data.userId);
        const urole = (data.role || "").toLowerCase();
        setContacts((prev) =>
          prev.map((c) =>
            Number(c.id) === uid && (c.role || "").toLowerCase() === urole
              ? { ...c, is_online: true }
              : c
          )
        );
      };

      const handleUserOffline = (data: any) => {
        if (!data?.userId) return;
        const uid = Number(data.userId);
        const urole = (data.role || "").toLowerCase();
        setContacts((prev) =>
          prev.map((c) =>
            Number(c.id) === uid && (c.role || "").toLowerCase() === urole
              ? { ...c, is_online: false }
              : c
          )
        );
      };

      const handleMessagesRead = (data: any) => {
        if (data?.senderId) {
          const sid = Number(data.senderId);
          setContacts((prev) =>
            prev.map((c) => (Number(c.id) === sid ? { ...c, unread_count: 0, unread: 0 } : c))
          );
          dispatch(fetchUnreadCount());
        }
      };

      const handleMessageSent = (sentMsg: any) => {
        const receiverId = Number(sentMsg.reciver || sentMsg.receiver);
        const receiverRole = (sentMsg.receiver_role || "teacher").toLowerCase();

        setContacts((prev) => {
          const idx = prev.findIndex(
            (c) => Number(c.id) === receiverId && (c.role || "teacher").toLowerCase() === receiverRole
          );
          if (idx >= 0) {
            const copy = [...prev];
            const found = copy[idx];
            const updated = {
              ...found,
              last_message: sentMsg.message || (sentMsg.file ? "Sent an attachment" : ""),
              last_message_time: sentMsg.time || new Date().toISOString(),
            };
            copy.splice(idx, 1);
            return [updated, ...copy];
          }
          return prev;
        });
      };

      activeSocket.on("receive_message", handleReceive);
      activeSocket.on("message_sent", handleMessageSent);
      activeSocket.on("online_users_list", handleOnlineList);
      activeSocket.on("user_online", handleUserOnline);
      activeSocket.on("user_offline", handleUserOffline);
      activeSocket.on("messages_read", handleMessagesRead);

      cleanupListeners = () => {
        activeSocket.off("receive_message", handleReceive);
        activeSocket.off("message_sent", handleMessageSent);
        activeSocket.off("online_users_list", handleOnlineList);
        activeSocket.off("user_online", handleUserOnline);
        activeSocket.off("user_offline", handleUserOffline);
        activeSocket.off("messages_read", handleMessagesRead);
      };
    };

    setupSocket();

    return () => {
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [dispatch, loadContacts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadContacts(true);
    dispatch(fetchUnreadCount());
  }, [loadContacts, dispatch]);

  const unreadTotal = useMemo(() => {
    return contacts.reduce((sum, c) => sum + (c.unread_count || c.unread || 0), 0);
  }, [contacts]);

  const filtered = useMemo(() => {
    let result = contacts;
    if (filterMode === "UNREAD") {
      result = result.filter((c) => (c.unread_count || c.unread || 0) > 0);
    }
    const q = query.toLowerCase().trim();
    if (!q) return result;
    return result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.role && c.role.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [query, contacts, filterMode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <Header />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}>
          <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search teachers and staff..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterMode("ALL")}
            style={[
              styles.filterChip,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              filterMode === "ALL" && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.textSecondary },
                filterMode === "ALL" && { color: colors.primary, fontWeight: "700" },
              ]}
            >
              All Messages ({contacts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterMode("UNREAD")}
            style={[
              styles.filterChip,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              filterMode === "UNREAD" && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.textSecondary },
                filterMode === "UNREAD" && { color: colors.primary, fontWeight: "700" },
              ]}
            >
              Unread ({unreadTotal})
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading conversations...</Text>
          </View>
        ) : filtered && filtered.length > 0 ? (
          <FlatList
            data={filtered}
            keyExtractor={(item) => `${(item.role || "teacher").toLowerCase()}_${item.id}`}
            renderItem={({ item }) => <Contactcard contact={item} />}
            contentContainerStyle={{
              paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 20,
              paddingTop: 8,
            }}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.centerContainer}>
            <MessageSquare size={44} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {query ? "No Contacts Found" : "No Conversations"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {query
                ? "Try searching for a different teacher or department name."
                : "Faculty and teachers will appear here. Tap to start messaging."}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.refreshBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Refresh Contacts</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default Message;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
