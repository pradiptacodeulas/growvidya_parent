import { Ionicons } from "@expo/vector-icons";
import { User } from "lucide-react-native";
import React, { useState, useEffect, useMemo } from "react";
import { Image, TouchableOpacity, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme";

export default function Avatar({
  size = 50,
  source,
  selected = false,
  onPress,
  outline = false,
}: {
  size?: number;
  source?: any;
  selected?: boolean;
  onPress?: () => void;
  outline?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [source?.uri || source]);

  const isValidSource = useMemo(() => {
    if (!source) return false;
    if (typeof source === "object" && "uri" in source) {
      if (!source.uri) return false;
      const uriStr = String(source.uri).trim();
      if (!uriStr || uriStr === "null" || uriStr === "undefined" || uriStr.endsWith("/") || uriStr.endsWith("/null") || uriStr.endsWith("/undefined")) {
        return false;
      }
    }
    return true;
  }, [source]);

  const showImage = isValidSource && !imageError;

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <View
        style={[
          styles.wrapper,
          { padding: 3, borderRadius: (size + 8) / 2 },
          selected && [styles.selectedWrapper, { borderColor: colors.primary, backgroundColor: isDark ? "rgba(61,94,225,0.2)" : colors.primaryLight }],
          outline && [styles.outlinedWrapper, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }],
        ]}
      >
        <View
          style={[
            styles.container,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.badgeBg },
          ]}
        >
          {showImage ? (
            <Image
              source={source}
              style={{ width: size, height: size, borderRadius: size / 2 }}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <User size={size * 0.52} color={colors.primary} strokeWidth={2.2} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedWrapper: {
    borderWidth: 2,
  },
  outlinedWrapper: {
    borderWidth: 1.5,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});
