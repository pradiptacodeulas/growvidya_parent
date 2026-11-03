import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { X, Search } from "lucide-react-native";
import { useAppTheme } from "@/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface SelectionItem {
  id: string | number;
  name: string;
}

interface SelectionBottomSheetProps {
  title: string;
  data: SelectionItem[];
  onSelect: (item: SelectionItem) => void;
  onDismiss?: () => void;
  loading?: boolean;
}

const SelectionBottomSheet = forwardRef<BottomSheetModal, SelectionBottomSheetProps>(
  ({ title, data, onSelect, onDismiss, loading }, ref) => {
    const { colors, isDark } = useAppTheme();
    const [searchQuery, setSearchQuery] = useState("");

    const snapPoints = useMemo(() => ["50%", "100%"], []);

    const filteredData = useMemo(() => {
      if (!searchQuery) return data;
      return data.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [data, searchQuery]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const handleSelect = useCallback((item: SelectionItem) => {
      onSelect(item);
      setSearchQuery("");
      (ref as any).current?.dismiss();
    }, [onSelect, ref]);

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        topInset={SCREEN_HEIGHT * 0.1}
        onDismiss={onDismiss}
        backgroundStyle={{ backgroundColor: colors.cardBg }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={() => (ref as any).current?.dismiss()}
              style={styles.closeButton}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSubtle }]}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <BottomSheetTextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <BottomSheetFlatList
              data={filteredData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No results found</Text>
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  optionItem: {
    paddingVertical: 15,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: 1,
  },
  emptyContainer: {
    paddingTop: 50,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SelectionBottomSheet;
