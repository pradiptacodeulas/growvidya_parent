import SubHeader from "@/components/dashboard/SubHeader";
import LottieView from "lottie-react-native";
import {
  BookOpen,
  Bookmark,
  Calendar,
  Download,
  File,
  FileText,
  GraduationCap,
  Layers,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useAppTheme } from "@/theme";
import { getFileUrl, resolveStudentId } from "@/services/apiClient";
import {
  fetchDashboardData,
  fetchMaterialTypes,
  fetchStudyMaterials,
} from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";
import Toast from "react-native-toast-message";

const formatFileSize = (sizeVal?: string | number | null): string => {
  if (sizeVal === undefined || sizeVal === null || sizeVal === "") return "";
  const bytes = typeof sizeVal === "string" ? parseFloat(sizeVal) : sizeVal;
  if (isNaN(bytes) || bytes <= 0) {
    return typeof sizeVal === "string" && /[a-zA-Z]/.test(sizeVal) ? sizeVal : "";
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const raw = String(dateStr).trim();
  if (!raw) return "";
  try {
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      return raw.split(" ")[0].split("T")[0];
    }
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw.split(" ")[0].split("T")[0];
  }
};

const StudyMaterial = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  const {
    dashboardData,
    selectedStudentId,
    studyMaterials,
    materialTypes,
    studyMaterialsLoading,
    studyMaterialsError,
  } = useSelector((state: RootState) => state.home);

  const student = dashboardData?.student_details;

  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("ALL");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const targetStudentId = resolveStudentId(
    params.student_id,
    selectedStudentId,
    dashboardData,
    user
  );

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadStudyMaterials = useCallback(async () => {
    const activeId = resolveStudentId(
      params.student_id,
      selectedStudentId,
      dashboardData,
      user
    );
    if (!activeId) return;

    await Promise.all([
      dispatch(fetchStudyMaterials(activeId)),
      dispatch(fetchMaterialTypes()),
    ]);
  }, [params.student_id, selectedStudentId, dashboardData, user, dispatch]);

  useEffect(() => {
    loadStudyMaterials();
  }, [loadStudyMaterials]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudyMaterials();
    setRefreshing(false);
  }, [loadStudyMaterials]);

  // Build dynamic material type filters strictly from live API data
  const availableTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    if (Array.isArray(materialTypes)) {
      materialTypes.forEach((mt: any) => {
        if (mt?.id !== undefined && mt?.material_type_name) {
          if (mt.status === undefined || Number(mt.status) === 1) {
            map.set(String(mt.id), {
              id: String(mt.id),
              name: String(mt.material_type_name).trim(),
            });
          }
        }
      });
    }

    if (Array.isArray(studyMaterials)) {
      studyMaterials.forEach((sm: any) => {
        if (sm?.material_type_id && sm?.material_type_name) {
          const key = String(sm.material_type_id);
          if (!map.has(key)) {
            map.set(key, {
              id: key,
              name: String(sm.material_type_name).trim(),
            });
          }
        }
      });
    }

    return Array.from(map.values());
  }, [materialTypes, studyMaterials]);

  // Build dynamic subject filters strictly from live study materials
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(studyMaterials)) {
      studyMaterials.forEach((sm: any) => {
        if (sm?.subject_name && String(sm.subject_name).trim()) {
          set.add(String(sm.subject_name).trim());
        }
      });
    }
    return Array.from(set);
  }, [studyMaterials]);

  // Filtered study materials
  const filteredMaterials = useMemo(() => {
    if (!Array.isArray(studyMaterials)) return [];
    const q = searchQuery.trim().toLowerCase();

    return studyMaterials.filter((item: any) => {
      if (
        selectedTypeId !== "ALL" &&
        String(item.material_type_id) !== selectedTypeId
      ) {
        return false;
      }

      if (
        selectedSubject !== "ALL" &&
        String(item.subject_name || "").trim() !== selectedSubject
      ) {
        return false;
      }

      if (!q) return true;

      const titleMatch = String(item.title || "")
        .toLowerCase()
        .includes(q);
      const subjectMatch = String(item.subject_name || "")
        .toLowerCase()
        .includes(q);
      const chapterMatch = String(item.chapter || "")
        .toLowerCase()
        .includes(q);
      const descMatch = String(item.description || "")
        .toLowerCase()
        .includes(q);
      const typeMatch = String(item.material_type_name || "")
        .toLowerCase()
        .includes(q);

      return (
        titleMatch || subjectMatch || chapterMatch || descMatch || typeMatch
      );
    });
  }, [studyMaterials, selectedTypeId, selectedSubject, searchQuery]);

  const hasActiveFilters =
    selectedTypeId !== "ALL" ||
    selectedSubject !== "ALL" ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedTypeId("ALL");
    setSelectedSubject("ALL");
    setSearchQuery("");
  };

  /**
   * Direct in-app file download and save/share using expo-file-system and expo-sharing
   */
  const handleDownloadMaterial = async (item: any) => {
    const rawPath =
      item.attachment || item.file_path || item.file_url || item.attachments;
    if (!rawPath) {
      Alert.alert("Notice", "No attachment file is linked to this study material.");
      return;
    }

    if (item.allow_download !== undefined && Number(item.allow_download) === 0) {
      Alert.alert(
        "Download Restricted",
        "Downloading is disabled for this study material."
      );
      return;
    }

    const fullUrl = getFileUrl(rawPath);
    const fileName =
      item.attachment_original_name ||
      item.file_name ||
      rawPath.split("/").pop() ||
      `material_${item.id}`;
    setDownloadingId(item.id);

    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          const a = document.createElement("a");
          a.href = fullUrl;
          a.download = fileName;
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      }

      const localDir =
        FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!localDir) {
        throw new Error("Local file storage is not available on this device.");
      }

      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const localUri = `${localDir}${safeFileName}`;

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri);

      if (downloadResult.status !== 200) {
        throw new Error(
          `Server returned HTTP ${downloadResult.status}. Unable to download file.`
        );
      }

      const lower = safeFileName.toLowerCase();
      const isPdf = lower.endsWith(".pdf");
      const isPng = lower.endsWith(".png");
      const isJpg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
      const isDocx = lower.endsWith(".docx");
      const isDoc = lower.endsWith(".doc");

      const mimeType = isPdf
        ? "application/pdf"
        : isPng
        ? "image/png"
        : isJpg
        ? "image/jpeg"
        : isDocx
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : isDoc
        ? "application/msword"
        : "application/octet-stream";

      if (Platform.OS === "android") {
        let savedViaSaf = false;
        try {
          if (
            FileSystem.StorageAccessFramework?.requestDirectoryPermissionsAsync
          ) {
            const permissions =
              await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions?.granted && permissions?.directoryUri) {
              const base64Data = await FileSystem.readAsStringAsync(
                downloadResult.uri,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              const fileUri =
                await FileSystem.StorageAccessFramework.createFileAsync(
                  permissions.directoryUri,
                  safeFileName,
                  mimeType
                );
              await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              savedViaSaf = true;
              Toast.show({
                type: "success",
                text1: "Download Complete",
                text2: `${fileName} saved to your device folder.`,
              });
            }
          }
        } catch (safErr) {
          console.warn(
            "StorageAccessFramework save failed or cancelled:",
            safErr
          );
        }

        if (!savedViaSaf) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType,
              dialogTitle: `Save or Open ${fileName}`,
              UTI: isPdf ? "com.adobe.pdf" : undefined,
            });
          } else {
            Alert.alert(
              "Success",
              `File downloaded successfully: ${safeFileName}`
            );
          }
        }
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType,
            dialogTitle: `Save or Open ${fileName}`,
            UTI: isPdf ? "com.adobe.pdf" : undefined,
          });
        } else {
          Alert.alert(
            "Success",
            `File downloaded successfully: ${safeFileName}`
          );
        }
      }
    } catch (err: any) {
      console.warn("Study material download error:", err);
      Alert.alert(
        "Download Error",
        err.message ||
          "Failed to download study material. Please check your internet connection."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const studentFullName = student
    ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
    : "";
  const studentMetaParts: string[] = [];
  if (student?.class_name) {
    studentMetaParts.push(
      `Class ${student.class_name}${
        student.section_name ? ` - ${student.section_name}` : ""
      }`
    );
  }
  if (student?.roll_number) {
    studentMetaParts.push(`Roll: ${student.roll_number}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Study Material" isGradient={true} />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Student Summary Card (only rendered when active student data is loaded) */}
        {student && (
          <View
            style={[
              styles.studentInfoCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.iconCircle, { backgroundColor: colors.badgeBg }]}
            >
              <BookOpen size={22} color={colors.primary} />
            </View>
            <View style={styles.studentDetails}>
              {studentFullName ? (
                <Text style={[styles.studentName, { color: colors.text }]}>
                  {studentFullName}
                </Text>
              ) : null}
              {studentMetaParts.length > 0 ? (
                <Text
                  style={[styles.studentSub, { color: colors.textMuted }]}
                >
                  {studentMetaParts.join(" | ")}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Search Input */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by title, subject, or chapter..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Material Type Filter Pills (from live API) */}
        {availableTypes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedTypeId("ALL")}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedTypeId === "ALL" ? colors.primary : colors.cardBg,
                  borderColor:
                    selectedTypeId === "ALL" ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      selectedTypeId === "ALL" ? "#FFFFFF" : colors.textSecondary,
                  },
                ]}
              >
                All Types ({studyMaterials.length})
              </Text>
            </TouchableOpacity>

            {availableTypes.map((type) => {
              const isSelected = selectedTypeId === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  onPress={() =>
                    setSelectedTypeId(isSelected ? "ALL" : type.id)
                  }
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.cardBg,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected ? "#FFFFFF" : colors.textSecondary,
                      },
                    ]}
                  >
                    {type.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Subject Filter Pills (from live study materials) */}
        {availableSubjects.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectChipsRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedSubject("ALL")}
              style={[
                styles.subjectChip,
                {
                  backgroundColor:
                    selectedSubject === "ALL"
                      ? colors.primaryLight
                      : colors.surfaceSubtle,
                  borderColor:
                    selectedSubject === "ALL" ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  {
                    color:
                      selectedSubject === "ALL"
                        ? colors.primary
                        : colors.textSecondary,
                  },
                ]}
              >
                All Subjects
              </Text>
            </TouchableOpacity>

            {availableSubjects.map((subject) => {
              const isSelected = selectedSubject === subject;
              return (
                <TouchableOpacity
                  key={subject}
                  onPress={() =>
                    setSelectedSubject(isSelected ? "ALL" : subject)
                  }
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      {
                        color: isSelected
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {subject}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Learning Resources
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: isDark ? "#1E2545" : "#EEF2FF" },
            ]}
          >
            <Layers size={12} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {filteredMaterials.length}{" "}
              {filteredMaterials.length === 1 ? "Material" : "Materials"}
            </Text>
          </View>
        </View>

        {studyMaterialsLoading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading study materials...
            </Text>
          </View>
        ) : studyMaterialsError && filteredMaterials.length === 0 ? (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <FileText size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Unable to Load Study Materials
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              {studyMaterialsError}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={[
                styles.refreshBtn,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredMaterials.length > 0 ? (
          <View style={styles.materialList}>
            {filteredMaterials.map((item: any) => {
              const isDownloading = downloadingId === item.id;
              const rawPath =
                item.attachment ||
                item.file_path ||
                item.file_url ||
                item.attachments;
              const canDownload =
                Boolean(rawPath) &&
                (item.allow_download === undefined ||
                  Number(item.allow_download) !== 0);
              const fileExt = String(
                item.attachment_extension ||
                  item.file_type ||
                  (rawPath ? rawPath.split(".").pop() : "") ||
                  ""
              )
                .replace(/^\./, "")
                .toUpperCase();
              const fileSize = formatFileSize(
                item.attachment_size ?? item.file_size
              );
              const dateDisplay = formatDate(
                item.publish_date || item.created_at
              );

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.materialCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setSelectedItem(item)}
                  activeOpacity={0.85}
                >
                  {/* Top Row: Icon + Title + Type Badge */}
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.fileIconBox,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <File size={22} color={colors.primary} />
                    </View>

                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.titleBadgeRow}>
                        <Text
                          style={[styles.materialTitle, { color: colors.text }]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        {item.material_type_name ? (
                          <View
                            style={[
                              styles.typePill,
                              { backgroundColor: colors.primaryLight },
                            ]}
                          >
                            <Text
                              style={[
                                styles.typePillText,
                                { color: colors.primary },
                              ]}
                            >
                              {item.material_type_name}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {item.chapter ? (
                        <View style={styles.chapterRow}>
                          <Bookmark size={12} color={colors.primary} />
                          <Text
                            style={[
                              styles.chapterText,
                              { color: colors.primary },
                            ]}
                            numberOfLines={1}
                          >
                            {item.chapter}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Description */}
                  {item.description ? (
                    <Text
                      style={[
                        styles.descriptionText,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Metadata Chips (Subject, Class, File Info) */}
                  <View style={styles.tagsWrap}>
                    {item.subject_name ? (
                      <View
                        style={[
                          styles.metaTag,
                          { backgroundColor: colors.surfaceSubtle },
                        ]}
                      >
                        <BookOpen size={12} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.metaTagText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.subject_name}
                        </Text>
                      </View>
                    ) : null}

                    {item.class_name ? (
                      <View
                        style={[
                          styles.metaTag,
                          { backgroundColor: colors.surfaceSubtle },
                        ]}
                      >
                        <GraduationCap size={12} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.metaTagText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Class {item.class_name}
                          {item.section_name ? ` (${item.section_name})` : ""}
                        </Text>
                      </View>
                    ) : null}

                    {fileExt ? (
                      <View
                        style={[
                          styles.metaTag,
                          { backgroundColor: colors.surfaceSubtle },
                        ]}
                      >
                        <FileText size={12} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.metaTagText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {fileExt}
                          {fileSize ? ` • ${fileSize}` : ""}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Footer Row: Date + Download Action */}
                  <View
                    style={[
                      styles.cardFooterRow,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <View style={styles.dateRow}>
                      {dateDisplay ? (
                        <>
                          <Calendar size={12} color={colors.textMuted} />
                          <Text
                            style={[
                              styles.dateText,
                              { color: colors.textMuted },
                            ]}
                          >
                            {dateDisplay}
                          </Text>
                        </>
                      ) : null}
                    </View>

                    {canDownload && (
                      <TouchableOpacity
                        style={[
                          styles.downloadBtn,
                          {
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => handleDownloadMaterial(item)}
                        disabled={isDownloading}
                        activeOpacity={0.75}
                      >
                        {isDownloading ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.primary}
                          />
                        ) : (
                          <View style={styles.downloadInner}>
                            <Download size={14} color={colors.primary} />
                            <Text
                              style={[
                                styles.downloadLabel,
                                { color: colors.primary },
                              ]}
                            >
                              Download
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <LottieView
              autoPlay
              style={styles.lottie}
              source={require("@/assets/lottiefiles/empty_state.json")}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {hasActiveFilters
                ? "No Matching Study Materials"
                : "No Study Materials Published"}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              {hasActiveFilters
                ? "No study materials matched your current search or filter selection."
                : "Notes, syllabi, worksheets, and study resources uploaded by teachers for your child's class will appear here."}
            </Text>

            <TouchableOpacity
              onPress={hasActiveFilters ? resetFilters : onRefresh}
              style={[
                styles.refreshBtn,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
                {hasActiveFilters ? "Reset Filters" : "Check for Updates"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={Boolean(selectedItem)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedItem(null)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedItem && (
              <>
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.modalHeaderTitleWrap}>
                    {selectedItem.material_type_name ? (
                      <View
                        style={[
                          styles.typePill,
                          {
                            backgroundColor: colors.primaryLight,
                            alignSelf: "flex-start",
                            marginBottom: 6,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typePillText,
                            { color: colors.primary },
                          ]}
                        >
                          {selectedItem.material_type_name}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedItem.title}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedItem(null)}
                    style={[
                      styles.modalCloseBtn,
                      { backgroundColor: colors.surfaceSubtle },
                    ]}
                  >
                    <X size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  {selectedItem.chapter ? (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Chapter / Topic
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {selectedItem.chapter}
                      </Text>
                    </View>
                  ) : null}

                  {selectedItem.subject_name ? (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Subject
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {selectedItem.subject_name}
                      </Text>
                    </View>
                  ) : null}

                  {selectedItem.class_name ? (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Class & Section
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        Class {selectedItem.class_name}
                        {selectedItem.section_name
                          ? ` - Section ${selectedItem.section_name}`
                          : ""}
                      </Text>
                    </View>
                  ) : null}

                  {selectedItem.publish_date || selectedItem.created_at ? (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Published On
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {formatDate(
                          selectedItem.publish_date || selectedItem.created_at
                        )}
                      </Text>
                    </View>
                  ) : null}

                  {selectedItem.description ? (
                    <View style={styles.detailRow}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Description
                      </Text>
                      <Text
                        style={[
                          styles.detailDesc,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {selectedItem.description}
                      </Text>
                    </View>
                  ) : null}

                  {(selectedItem.attachment ||
                    selectedItem.file_path ||
                    selectedItem.file_url) && (
                    <View
                      style={[
                        styles.attachmentBox,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.fileIconBox,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <FileText size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.attachmentName,
                            { color: colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedItem.attachment_original_name ||
                            (
                              selectedItem.attachment ||
                              selectedItem.file_path ||
                              ""
                            )
                              .split("/")
                              .pop()}
                        </Text>
                        {formatFileSize(
                          selectedItem.attachment_size ?? selectedItem.file_size
                        ) ? (
                          <Text
                            style={[
                              styles.attachmentMeta,
                              { color: colors.textMuted },
                            ]}
                          >
                            {formatFileSize(
                              selectedItem.attachment_size ??
                                selectedItem.file_size
                            )}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}
                </ScrollView>

                {(selectedItem.attachment ||
                  selectedItem.file_path ||
                  selectedItem.file_url) &&
                  (selectedItem.allow_download === undefined ||
                    Number(selectedItem.allow_download) !== 0) && (
                    <TouchableOpacity
                      style={[
                        styles.modalDownloadBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => handleDownloadMaterial(selectedItem)}
                      disabled={downloadingId === selectedItem.id}
                      activeOpacity={0.85}
                    >
                      {downloadingId === selectedItem.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Download size={18} color="#FFFFFF" />
                          <Text style={styles.modalDownloadText}>
                            Download Attachment
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default StudyMaterial;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 36,
  },
  studentInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  studentSub: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 6,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 4,
  },
  filterChipsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  subjectChipsRow: {
    gap: 8,
    paddingBottom: 12,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  materialList: {
    gap: 12,
  },
  materialCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  materialTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chapterText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaTagText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 92,
  },
  downloadInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  downloadLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  mainCard: {
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 10,
  },
  lottie: {
    width: 140,
    height: 140,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: "82%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalHeaderTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    marginTop: 14,
  },
  detailRow: {
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  detailDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  attachmentBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  attachmentName: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  attachmentMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  modalDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  modalDownloadText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
