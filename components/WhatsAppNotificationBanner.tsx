import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MessageSquare, X } from "lucide-react-native";
import { AppDispatch, RootState } from "@/redux/store";
import { hideNotificationBanner } from "@/redux/features/chat/slice";
import { useAppTheme } from "@/theme";
import { getAvatarUrl } from "@/services/apiClient";

export default function WhatsAppNotificationBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { isDark } = useAppTheme();
  const bannerData = useSelector((state: RootState) => state.chat?.notificationBanner);

  const [imageError, setImageError] = useState(false);
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<any>(null);

  const dismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -140,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dispatch(hideNotificationBanner());
    });
  };

  useEffect(() => {
    if (bannerData) {
      setImageError(false);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      translateY.setValue(-140);
      opacity.setValue(0);

      // Slide down spring animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, 5000);
    } else {
      translateY.setValue(-140);
      opacity.setValue(0);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [bannerData]);

  // Swipe up to dismiss PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -6;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20 || gestureState.vy < -0.5) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 9,
          }).start();
        }
      },
    })
  ).current;

  if (!bannerData) return null;

  const handlePress = () => {
    dismiss();
    router.push({
      pathname: `/chat/[id]`,
      params: {
        id: String(bannerData.senderId),
        role: bannerData.senderRole.toLowerCase(),
        name: bannerData.senderName,
        picture: bannerData.senderPicture || "",
      },
    } as any);
  };

  const senderAvatarUri = bannerData.senderPicture
    ? getAvatarUrl(bannerData.senderPicture)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        bannerData.senderName || "User"
      )}&background=2563eb&color=fff&size=128&bold=true`;

  const initials = (bannerData.senderName || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const topOffset = Math.max(insets.top, Platform.OS === "ios" ? 44 : 12) + 6;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.rootOverlay, { top: topOffset }]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.bannerCard,
          {
            backgroundColor: isDark ? "#1F2C34" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePress}
          style={styles.innerTouchable}
        >
          {/* Avatar with WhatsApp / Message Badge */}
          <View style={styles.avatarContainer}>
            {imageError ? (
              <View style={[styles.avatar, styles.initialsContainer]}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            ) : (
              <Image
                source={{ uri: senderAvatarUri }}
                style={styles.avatar}
                contentFit="cover"
                transition={150}
                onError={() => setImageError(true)}
              />
            )}
            {/* WhatsApp Green Badge */}
            <View style={styles.whatsappBadge}>
              <MessageSquare size={10} color="#FFFFFF" />
            </View>
          </View>

          {/* Message Content */}
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <View style={styles.nameRoleContainer}>
                <Text
                  numberOfLines={1}
                  style={[styles.senderName, { color: isDark ? "#F3F4F6" : "#111827" }]}
                >
                  {bannerData.senderName}
                </Text>
                {bannerData.senderRole && (
                  <View style={styles.roleChip}>
                    <Text style={styles.roleChipText}>
                      {bannerData.senderRole.charAt(0).toUpperCase() +
                        bannerData.senderRole.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.timeText}>{bannerData.timestamp || "now"}</Text>
            </View>

            <Text
              numberOfLines={2}
              style={[styles.messageText, { color: isDark ? "#D1D5DB" : "#4B5563" }]}
            >
              {bannerData.message}
            </Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: "center",
  },
  bannerCard: {
    width: "94%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  innerTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E5E7EB",
  },
  initialsContainer: {
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  whatsappBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#25D366", // WhatsApp iconic green
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    marginRight: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  nameRoleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    marginRight: 6,
  },
  senderName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  roleChip: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 6,
  },
  roleChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#2563EB",
    textTransform: "capitalize",
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
