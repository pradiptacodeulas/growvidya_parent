import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/theme";

interface DashboardSubHeaderProps {
  title: string;
  isGradient?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export default function DashboardSubHeader({
  title,
  isGradient,
  children,
  style,
}: DashboardSubHeaderProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <>
      <StatusBar style={isGradient ? "light" : colors.statusBarStyle} />
      {isGradient ? (
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.headerWrapper,
            styles.headerWrapperGradient,
            { paddingTop: insets.top },
            style,
          ]}
        >
          <HeaderContent
            title={title}
            isGradient={isGradient}
            router={router}
            navigation={navigation}
            colors={colors}
          />
          {children}
        </LinearGradient>
      ) : (
        <View style={[styles.headerWrapper, { paddingTop: insets.top, backgroundColor: colors.headerBg, borderBottomColor: colors.border }, style]}>
          <HeaderContent
            title={title}
            isGradient={isGradient}
            router={router}
            navigation={navigation}
            colors={colors}
          />
          {children}
        </View>
      )}
    </>
  );
}

function HeaderContent({
  title,
  isGradient,
  router,
  navigation,
  colors,
}: {
  title: string;
  isGradient?: boolean;
  router: any;
  navigation: any;
  colors: any;
}) {
  return (
    <View style={styles.headerContainer}>
      {/* Left: Back Button */}
      <TouchableOpacity
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(main)/(tabs)");
          }
        }}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: isGradient ? "rgba(255,255,255,0.2)" : colors.surfaceSubtle }]}
        >
          <ChevronLeft size={22} color={isGradient ? "#FFF" : colors.primary} />
        </View>
      </TouchableOpacity>

      {/* Center: Title */}
      <View style={styles.titleContainer}>
        <Text
          style={[styles.headerTitle, { color: isGradient ? "#FFF" : colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right: Empty View for Balance */}
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    overflow: "hidden", // Crucial for iOS rounded corners clipping
  },
  headerWrapperGradient: {
    borderBottomWidth: 0,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleGradient: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  titleContainer: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  headerTitleGradient: {
    color: "#FFF",
  },
  rightSpacer: {
    width: 40,
  },
});
